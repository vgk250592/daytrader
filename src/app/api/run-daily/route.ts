// src/app/api/run-daily/route.ts
// ✅ UPDATED VERSION - Polygon.io integration with existing structure

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { fetchRedditPosts } from "@/server/reddit";
import { aggregateTickerMentions } from "@/server/tickers";
import { getMultipleMarketData, createFallbackMarketData } from "@/server/market";
import { filterTickers } from "@/server/ticker-validator";
import { compositeScore } from "@/server/score";
import { getCachedData, setCachedData } from "@/server/cache";
import vader from "vader-sentiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  console.log("\n🚀 Starting daily check with Polygon.io...");
  
  try {
    // Check cache first (15 minute TTL)
    const cached = getCachedData('daily-scan');
    if (cached) {
      console.log('✅ Returning cached results\n');
      return NextResponse.json(cached);
    }

    // 1) fetch reddit data
    console.log("📡 Fetching Reddit posts...");
    const posts = await fetchRedditPosts("wallstreetbets", 100);
    console.log(`✓ Fetched ${posts.length} posts`);

    if (!posts || posts.length === 0) {
      throw new Error("No Reddit posts fetched");
    }

    // 2) aggregate ticker mentions and calculate buzz
    console.log("🔍 Aggregating ticker mentions...");
    const tickerMentions = aggregateTickerMentions(posts);
    console.log(`✓ Found ${tickerMentions.length} unique tickers`);
    
    if (tickerMentions.length === 0) {
      return NextResponse.json({ 
        rows: [],
        message: "No tickers found in Reddit posts"
      });
    }
    
    // 3) Validate tickers using smart validator
    console.log("✅ Validating tickers...");
    const rawTickers = tickerMentions.map(tm => tm.ticker);
    const { valid: validTickers, warnings } = filterTickers(rawTickers);
    console.log(`✓ Valid tickers: ${validTickers.length}/${rawTickers.length}`);
    
    if (warnings.length > 0) {
      console.log(`⚠️  Not in NASDAQ database (will try API): ${warnings.slice(0, 5).join(', ')}${warnings.length > 5 ? '...' : ''}`);
    }
    
    if (validTickers.length === 0) {
      return NextResponse.json({ 
        rows: [],
        message: "No valid tickers found after filtering"
      });
    }
    
    // Filter tickerMentions to only include valid tickers
    const validTickerMentions = tickerMentions.filter(tm => validTickers.includes(tm.ticker));
    
    // Calculate buzz z-scores
    console.log("📊 Calculating buzz scores...");
    const counts = validTickerMentions.map(t => t.count);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdCount = Math.sqrt(
      counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length
    );

    const reddit = validTickerMentions.map(tm => {
      const buzzZ = stdCount > 0 ? (tm.count - avgCount) / stdCount : 0;
      
      // Calculate sentiment using vader
      const allText = tm.posts.map(p => p.text).join(" ");
      const sentimentScore = vader.SentimentIntensityAnalyzer.polarity_scores(allText);
      const sentiment = sentimentScore.compound; // -1 to 1
      
      return {
        ticker: tm.ticker,
        buzzZ,
        sentiment,
        count: tm.count,
        totalScore: tm.totalScore,
      };
    });

    console.log(`✓ Calculated buzz scores for ${reddit.length} tickers`);

    // 4) take the top 30 symbols by reddit score/buzz
    const topReddit = reddit
      .sort((a, b) => b.buzzZ - a.buzzZ)
      .slice(0, 30);
    
    const symbols = topReddit.map(r => r.ticker);

    console.log(`📈 Fetching market data for top ${symbols.length} tickers from Polygon.io...`);
    console.log(`Top tickers: ${symbols.slice(0, 10).join(", ")}`);

    // 5) Fetch market data using Polygon.io
    const marketDataMap = await getMultipleMarketData(symbols);
    const marketCount = marketDataMap.size;
    console.log(`✓ Fetched market data for ${marketCount}/${symbols.length} tickers (${Math.round(marketCount/symbols.length*100)}% success rate)`);
    
    if (marketCount === 0) {
      console.warn("⚠️  No market data fetched - check Polygon.io API key");
    }

    // 6) score + classify
    console.log("🎯 Scoring and classifying tickers...");
    const rows = topReddit
      .map(r => {
        // Get market data or use fallback
        let marketData = marketDataMap.get(r.ticker);
        
        if (!marketData) {
          console.log(`  ⚠️  ${r.ticker}: Using fallback (no market data)`);
          marketData = createFallbackMarketData(r.ticker);
        }
        
        const price = marketData.price;
        const atrPct = marketData.atrPercent / 100; // Convert to decimal
        const avgDollarVol = marketData.avgVolume * price;
        
        const momentum = 0.5; // placeholder feature
        const quality = (avgDollarVol > 50_000_000 && price > 2 && price < 500) ? 1 : 0;

        const score = compositeScore({
          buzzZ: r.buzzZ,
          sentiment: r.sentiment,
          momentum,
          quality
        });

        const list =
          score >= 0.65 ? "DAY_TRADE" :
          score >= 0.55 && atrPct < 0.12 ? "SWING" : "SWING";

        return {
          ticker: r.ticker,
          score: Number(score.toFixed(2)),
          buzzZ: Number(r.buzzZ.toFixed(2)),
          sentiment: Number(r.sentiment.toFixed(2)),
          gapPct: Number(marketData.gapPercent.toFixed(2)),
          vwapRel: 1,
          volAbnormal: Number(marketData.volumeRatio.toFixed(2)),
          atrPct: Number(atrPct.toFixed(3)),
          newsCount: 0,
          list,
          rationale: marketData.price > 0 
            ? "Reddit buzz + sentiment + Polygon.io market data" 
            : "Reddit buzz + sentiment only (no market data)"
        };
      });

    console.log(`✓ Classified ${rows.length} tickers`);

    // 7) persist a line per run for your rolling backtest
    try {
      await fs.mkdir("data", { recursive: true });
      const today = new Date().toISOString().slice(0, 10);
      const record = rows.map(r => ({ date: today, ...r }));
      await fs.appendFile("data/signals.jsonl", record.map(x => JSON.stringify(x)).join("\n") + "\n", "utf-8");
      console.log("✓ Saved results to data/signals.jsonl");
    } catch (fsError: any) {
      console.warn("⚠️  Could not save to file:", fsError.message);
    }

    const topRows = rows.slice(0, 20);
    console.log(`✅ Returning ${topRows.length} tickers to client`);
    console.log("Sample tickers:", topRows.slice(0, 5).map(r => `${r.ticker}(${r.score})`).join(", "));

    const result = { rows: topRows };
    
    // Cache results for 15 minutes
    setCachedData('daily-scan', result, 15 * 60 * 1000);

    return NextResponse.json(result);
    
  } catch (e: any) {
    const status = e?.response?.status;
    const payload = e?.response?.data ?? e?.message ?? String(e);
    console.error("❌ run-daily error:", status ?? "no-status", payload);
    console.error("Full error:", e);

    return NextResponse.json(
      { error: payload },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}
