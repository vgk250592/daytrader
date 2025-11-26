// src/app/api/run-daily/route.ts
// IMPROVED VERSION - Shows tickers even if market data fails

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { fetchRedditPosts } from "@/server/reddit";
import { aggregateTickerMentions } from "@/server/tickers";
import { getMarketFeatures } from "@/server/market";
import { compositeScore } from "@/server/score";
import vader from "vader-sentiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  console.log("\n🚀 Starting daily check...");
  
  try {
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
    
    // Calculate buzz z-scores
    console.log("📊 Calculating buzz scores...");
    const counts = tickerMentions.map(t => t.count);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdCount = Math.sqrt(
      counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length
    );

    const reddit = tickerMentions.map(tm => {
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

    // 3) take the top 30 symbols by reddit score/buzz (reduced from 60 to avoid rate limits)
    const topReddit = reddit
      .sort((a, b) => b.buzzZ - a.buzzZ)
      .slice(0, 30);
    
    const symbols = topReddit.map(r => r.ticker);

    console.log(`📈 Fetching market data for top ${symbols.length} tickers...`);
    console.log(`Top tickers: ${symbols.slice(0, 10).join(", ")}`);

    // 4) add market features (ATR%, $-vol, etc.)
    const market = await getMarketFeatures(symbols);
    const marketCount = Object.keys(market).length;
    console.log(`✓ Fetched market data for ${marketCount} tickers`);
    
    if (marketCount === 0) {
      console.warn("⚠️  No market data fetched - Yahoo Finance may be rate limiting");
      console.warn("⚠️  Returning tickers with Reddit data only");
    }

    // 5) score + classify
    console.log("🎯 Scoring and classifying tickers...");
    const rows = topReddit
      .map(r => {
        const m = market[r.ticker];
        
        // If no market data, use defaults but still include the ticker
        const price = m?.price || 0;
        const atrPct = m?.atrPct || 0;
        const avgDollarVol = m?.avgDollarVol || 0;
        
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
          gapPct: 0,
          vwapRel: 1,
          volAbnormal: 1,
          atrPct: Number(atrPct.toFixed(3)),
          newsCount: 0,
          list,
          rationale: m ? "Reddit buzz + sentiment + liquidity filter" : "Reddit buzz + sentiment only (no market data)"
        };
      });

    console.log(`✓ Classified ${rows.length} tickers`);

    // 6) persist a line per run for your rolling backtest
    try {
      await fs.mkdir("data", { recursive: true });
      const today = new Date().toISOString().slice(0, 10);
      const record = rows.map(r => ({ date: today, ...r }));
      await fs.appendFile("data/signals.jsonl", record.map(x => JSON.stringify(x)).join("\n") + "\n", "utf-8");
      console.log("✓ Saved results to data/signals.jsonl");
    } catch (fsError: any) {
      console.warn("⚠️  Could not save to file:", fsError.message);
      // Don't fail the request if file save fails
    }

    const topRows = rows.slice(0, 20);
    console.log(`✅ Returning ${topRows.length} tickers to client`);
    console.log("Sample tickers:", topRows.slice(0, 5).map(r => `${r.ticker}(${r.score})`).join(", "));

    return NextResponse.json({ rows: topRows });
    
  } catch (e: any) {
    // Show the REAL error in your terminal and return it to the client as JSON
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
