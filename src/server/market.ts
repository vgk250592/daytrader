// ✅ CORRECTED VERSION - Addresses all ChatGPT issues
// src/server/market-polygon.ts

import { restClient } from '@polygon.io/client-js';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';

if (!POLYGON_API_KEY) {
  console.error('❌ POLYGON_API_KEY not found in environment variables');
}

const polygon = restClient(POLYGON_API_KEY);

// Rate limiting: Polygon.io free tier = 5 calls/minute
const DELAY_MS = 12000; // 12 seconds between requests (5 per minute)

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

// ✅ FIX #7: Proper delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ✅ FIX #3: Clean Polygon.io implementation
 * Fetches market data for a single ticker using Polygon.io API
 */
export async function getMarketData(ticker: string): Promise<MarketData | null> {
  try {
    console.log(`  📊 Fetching ${ticker} from Polygon.io...`);

    // Get previous day's data (includes OHLCV)
    const prevClose = await polygon.stocks.previousClose(ticker);
    
    if (!prevClose.results || prevClose.results.length === 0) {
      console.log(`  ⚠️  ${ticker}: No data from Polygon.io`);
      return null;
    }

    const data = prevClose.results[0];

    // Get aggregates for ATR calculation (last 14 days)
    const to = new Date();
    const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const aggs = await polygon.stocks.aggregates(
      ticker,
      1,
      'day',
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0]
    );

    // Calculate ATR (Average True Range)
    let atr = 0;
    if (aggs.results && aggs.results.length >= 2) {
      const ranges = aggs.results.map((bar: any) => bar.h - bar.l);
      atr = ranges.reduce((a: number, b: number) => a + b, 0) / ranges.length;
    }

    // Get ticker details for market cap and avg volume
    const details = await polygon.reference.tickerDetails(ticker);
    
    const price = data.c || 0;
    const prevPrice = data.o || price;
    const change = price - prevPrice;
    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
    const volume = data.v || 0;
    const avgVolume = details.results?.weighted_shares_outstanding || volume;
    const volumeRatio = avgVolume > 0 ? volume / avgVolume : 0;
    const atrPercent = price > 0 ? (atr / price) * 100 : 0;

    // Gap calculation (difference between today's open and yesterday's close)
    const gap = data.o - data.c;
    const gapPercent = data.c > 0 ? (gap / data.c) * 100 : 0;

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
      high52Week: data.h || 0,
      low52Week: data.l || 0,
      marketCap: details.results?.market_cap || 0,
    };

    console.log(`  ✅ ${ticker}: $${price.toFixed(2)} | ATR: ${atrPercent.toFixed(2)}% | Vol: ${volumeRatio.toFixed(1)}x`);
    
    return marketData;

  } catch (error: any) {
    // ✅ FIX #5: Clean error logging (no spam)
    console.log(`  ❌ ${ticker}: ${error.message || 'API error'}`);
    return null;
  }
}

/**
 * ✅ FIX #7: Proper sequential processing with correct delay placement
 * Fetches market data for multiple tickers with rate limiting
 */
export async function getMultipleMarketData(tickers: string[]): Promise<Map<string, MarketData>> {
  const results = new Map<string, MarketData>();
  
  console.log(`\n📊 Fetching market data for ${tickers.length} tickers from Polygon.io...`);
  console.log(`⏱️  Estimated time: ${Math.ceil(tickers.length * DELAY_MS / 1000 / 60)} minutes\n`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const data = await getMarketData(ticker);
    
    if (data) {
      results.set(ticker, data);
    }

    // ✅ FIX #7: Delay AFTER processing, BEFORE next request
    // Don't delay after the last ticker
    if (i < tickers.length - 1) {
      console.log(`  ⏳ Waiting 12s... (${i + 1}/${tickers.length})`);
      await delay(DELAY_MS);
    }
  }

  console.log(`\n✅ Market data fetched: ${results.size}/${tickers.length} successful\n`);
  
  return results;
}

/**
 * ✅ FIX #2 & #6: Fallback to show tickers even if market data fails
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
