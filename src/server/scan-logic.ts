// Core scanning logic - extracted for reuse
// src/server/scan-logic.ts

import { fetchRedditPosts, getTickerDiscussion, type RedditPost } from "./reddit";
import { aggregateTickerMentions } from "./tickers";
import { getMultipleMarketData, createFallbackMarketData } from "./market";
import { filterTickers } from "./ticker-validator";
import { compositeScore } from "./score";
import { batchSummarizeDiscussions } from "./ai-summarizer";
import vader from "vader-sentiment";

export interface ScanResult {
  ticker: string;
  score: number;
  buzzZ: number;
  sentiment: number;
  gapPct: number;
  vwapRel: number;
  volAbnormal: number;
  atrPct: number;
  newsCount: number;
  trend5Day: number;
  list: string;
  rationale: string;
  redditSummary?: {
    summary: string;
    bullishPoints: string[];
    bearishPoints: string[];
    keyQuotes: string[];
    overallSentiment: 'bullish' | 'bearish' | 'neutral';
    postLinks: string[];
  };
}

/**
 * Run the daily scan and return results
 * This is the core logic extracted from route.ts
 */
export async function runDailyScan(): Promise<ScanResult[]> {
  console.log("\n🚀 Starting daily scan with Polygon.io...");
  
  // 1) fetch reddit data
  console.log("📡 Fetching Reddit posts...");
  const posts: RedditPost[] = await fetchRedditPosts("wallstreetbets", 100);
  console.log(`✓ Fetched ${posts.length} posts`);

  if (!posts || posts.length === 0) {
    throw new Error("No Reddit posts fetched");
  }

  // 2) aggregate ticker mentions and calculate buzz
  console.log("🔍 Aggregating ticker mentions...");
  const tickerMentions = aggregateTickerMentions(posts);
  console.log(`✓ Found ${tickerMentions.length} unique tickers`);
  
  if (tickerMentions.length === 0) {
    return [];
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
    return [];
  }
  
  // Filter tickerMentions to only include valid tickers
  const validTickerMentions = tickerMentions.filter(tm => validTickers.includes(tm.ticker));
  
  // Calculate normalized buzz scores (0-1 range)
  console.log("📊 Calculating buzz scores...");
  const counts = validTickerMentions.map(t => t.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  const reddit = validTickerMentions.map(tm => {
    // Normalize to 0-1 range
    const buzzZ = maxCount > minCount ? (tm.count - minCount) / (maxCount - minCount) : 0.5;
    
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

  // 6) Fetch Reddit discussions and generate AI summaries
  console.log("\n💬 Fetching Reddit discussions for top tickers...");
  const discussionPromises = topReddit.slice(0, 10).map(async (r) => {
    const discussion = await getTickerDiscussion(r.ticker, posts);
    return {
      ticker: r.ticker,
      postTitles: discussion.posts.map(p => p.title),
      comments: discussion.topComments,
      postLinks: discussion.posts.map(p => p.permalink),
    };
  });

  const discussions = await Promise.all(discussionPromises);
  console.log(`✓ Fetched discussions for ${discussions.length} tickers`);

  // 7) Generate AI summaries
  console.log("\n🤖 Generating AI summaries...");
  const summariesMap = await batchSummarizeDiscussions(discussions);
  console.log(`✓ Generated ${summariesMap.size} AI summaries`);

  // 8) score + classify
  console.log("\n🎯 Scoring and classifying tickers...");
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

      // Get Reddit summary if available
      const summary = summariesMap.get(r.ticker);
      const discussion = discussions.find(d => d.ticker === r.ticker);

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
        trend5Day: Number(marketData.trend5Day.toFixed(2)),
        price: marketData.price,
        changePercent: Number(marketData.gapPercent.toFixed(2)),
        volume: marketData.volume,
        list,
        rationale: marketData.price > 0 
          ? "Reddit buzz + sentiment + Polygon.io market data" 
          : "Reddit buzz + sentiment only (no market data)",
        redditSummary: summary ? {
          summary: summary.summary,
          bullishPoints: summary.bullishPoints,
          bearishPoints: summary.bearishPoints,
          keyQuotes: summary.keyQuotes,
          overallSentiment: summary.overallSentiment,
          postLinks: discussion?.postLinks || [],
        } : undefined,
      };
    });

  console.log(`✓ Classified ${rows.length} tickers`);

  return rows.slice(0, 20); // Return top 20
}
