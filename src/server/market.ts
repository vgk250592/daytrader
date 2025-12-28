// ✅ FIXED VERSION - Using correct Polygon.io client-js API
// src/server/market.ts

import { restClient } from '@polygon.io/client-js';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';

if (!POLYGON_API_KEY) {
  console.error('❌ POLYGON_API_KEY not found in environment variables');
}

// Initialize Polygon.io REST client
const rest = restClient(POLYGON_API_KEY);

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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches market data for a single ticker using Polygon.io API
 */
export async function getMarketData(ticker: string): Promise<MarketData | null> {
  try {
    console.log(`  📊 Fetching ${ticker} from Polygon.io...`);

    if (!POLYGON_API_KEY) {
      console.log(`  ❌ ${ticker}: No Polygon.io API key configured`);
      return null;
    }

    // Get previous day's close data
    const prevCloseResponse = await rest.stocks.previousClose(ticker);
    
    if (!prevCloseResponse || !prevCloseResponse.results || prevCloseResponse.results.length === 0) {
      console.log(`  ⚠️  ${ticker}: No data from Polygon.io`);
      return null;
    }

    const data = prevCloseResponse.results[0];

    // Get aggregates for ATR calculation (last 14 days)
    const to = new Date();
    const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    let atr = 0;
    try {
      const aggsResponse = await rest.stocks.aggregates(
        ticker,
        1,
        'day',
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0]
      );

      // Calculate ATR (Average True Range)
      if (aggsResponse && aggsResponse.results && aggsResponse.results.length >= 2) {
        const ranges = aggsResponse.results.map((bar: any) => bar.h - bar.l);
        atr = ranges.reduce((a: number, b: number) => a + b, 0) / ranges.length;
      }
    } catch (aggError) {
      // ATR calculation failed, continue with 0
      console.log(`  ⚠️  ${ticker}: Could not calculate ATR`);
    }

    // Get ticker details for market cap
    let marketCap = 0;
    
    try {
      const detailsResponse = await rest.reference.tickerDetails(ticker);
      if (detailsResponse && detailsResponse.results) {
        marketCap = detailsResponse.results.market_cap || 0;
      }
    } catch (detailsError) {
      // Details fetch failed, continue with defaults
      console.log(`  ⚠️  ${ticker}: Could not fetch details`);
    }
    
    const price = data.c || 0;
    const open = data.o || price;
    const prevClose = data.c || price; // Previous close
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const volume = data.v || 0;
    
    // Use 30-day average volume if available, otherwise use current volume
    const avgVolume = data.vw || volume; // vw = volume weighted average
    const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
    const atrPercent = price > 0 ? (atr / price) * 100 : 0;

    // Gap calculation (difference between today's open and yesterday's close)
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
      high52Week: data.h || 0,
      low52Week: data.l || 0,
      marketCap,
    };

    console.log(`  ✅ ${ticker}: $${price.toFixed(2)} | ATR: ${atrPercent.toFixed(2)}% | Vol: ${volumeRatio.toFixed(1)}x`);
    
    return marketData;

  } catch (error: any) {
    console.log(`  ❌ ${ticker}: ${error.message || 'API error'}`);
    return null;
  }
}

/**
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

    // Delay AFTER processing, BEFORE next request
    if (i < tickers.length - 1) {
      console.log(`  ⏳ Waiting 12s... (${i + 1}/${tickers.length})`);
      await delay(DELAY_MS);
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
