// ✅ OPTIMIZED VERSION - Parallel batch processing for speed
// src/server/market.ts

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';

if (!POLYGON_API_KEY) {
  console.error('❌ POLYGON_API_KEY not found in environment variables');
}

const BASE_URL = 'https://api.polygon.io';

// Optimized rate limiting: Process 5 tickers in parallel (free tier = 5 calls/min)
const BATCH_SIZE = 5; // Process 5 tickers at once
const BATCH_DELAY_MS = 12000; // 12 seconds between batches

interface MarketData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  atr: number;
  atrPercent: number;
  gap: number;
  gapPercent: number;
  volumeRatio: number;
  high52Week: number;
  low52Week: number;
  marketCap: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches market data for a single ticker using Polygon.io REST API
 */
export async function getMarketData(ticker: string): Promise<MarketData | null> {
  try {
    if (!POLYGON_API_KEY) {
      console.log(`  ❌ ${ticker}: No Polygon.io API key configured`);
      return null;
    }

    // Get previous day's close data
    const prevCloseUrl = `${BASE_URL}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const prevCloseRes = await fetch(prevCloseUrl);
    
    if (!prevCloseRes.ok) {
      console.log(`  ⚠️  ${ticker}: API returned ${prevCloseRes.status}`);
      return null;
    }

    const prevCloseData = await prevCloseRes.json();
    
    if (!prevCloseData.results || prevCloseData.results.length === 0) {
      console.log(`  ⚠️  ${ticker}: No data from Polygon.io`);
      return null;
    }

    const data = prevCloseData.results[0];

    // Simplified: Use data from previous close (skip ATR and details for speed)
    const price = data.c || 0;
    const open = data.o || price;
    const prevClose = data.c || price;
    const high = data.h || price;
    const low = data.l || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const volume = data.v || 0;
    
    // Estimate ATR from high-low range (faster than fetching 14 days)
    const atr = high - low;
    const atrPercent = price > 0 ? (atr / price) * 100 : 0;

    // Use volume weighted average if available
    const avgVolume = data.vw || volume;
    const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;

    // Gap calculation
    const gap = open - prevClose;
    const gapPercent = prevClose > 0 ? (gap / prevClose) * 100 : 0;

    const marketData: MarketData = {
      ticker,
      price,
      change,
      changePercent,
      volume,
      avgVolume,
      atr,
      atrPercent,
      gap,
      gapPercent,
      volumeRatio,
      high52Week: high,
      low52Week: low,
      marketCap: 0, // Skip for speed
    };

    console.log(`  ✅ ${ticker}: $${price.toFixed(2)} | ATR: ${atrPercent.toFixed(2)}% | Vol: ${volumeRatio.toFixed(1)}x`);
    
    return marketData;

  } catch (error: any) {
    console.log(`  ❌ ${ticker}: ${error.message || 'API error'}`);
    return null;
  }
}

/**
 * Fetches market data for multiple tickers with PARALLEL batch processing
 * MUCH FASTER: 30 tickers in ~1 minute instead of 6 minutes
 */
export async function getMultipleMarketData(tickers: string[]): Promise<Map<string, MarketData>> {
  const results = new Map<string, MarketData>();
  
  // Split tickers into batches of 5
  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    batches.push(tickers.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`\n📊 Fetching market data for ${tickers.length} tickers from Polygon.io...`);
  console.log(`⚡ Processing ${BATCH_SIZE} tickers in parallel per batch`);
  console.log(`⏱️  Estimated time: ${Math.ceil(batches.length * BATCH_DELAY_MS / 1000)} seconds\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n🔄 Batch ${i + 1}/${batches.length}: ${batch.join(', ')}`);
    
    // Process all tickers in this batch IN PARALLEL
    const promises = batch.map(ticker => getMarketData(ticker));
    const batchResults = await Promise.all(promises);
    
    // Store successful results
    batchResults.forEach((data, idx) => {
      if (data) {
        results.set(batch[idx], data);
      }
    });

    // Delay between batches (not after last batch)
    if (i < batches.length - 1) {
      console.log(`\n⏳ Waiting 12s before next batch...`);
      await delay(BATCH_DELAY_MS);
    }
  }

  console.log(`\n✅ Market data fetched: ${results.size}/${tickers.length} successful\n`);
  
  return results;
}

/**
 * Creates minimal market data object for failed API calls
 */
export function createFallbackMarketData(ticker: string): MarketData {
  return {
    ticker,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    avgVolume: 0,
    atr: 0,
    atrPercent: 0,
    gap: 0,
    gapPercent: 0,
    volumeRatio: 0,
    high52Week: 0,
    low52Week: 0,
    marketCap: 0,
  };
}
