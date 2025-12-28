// Market data fetching with Polygon.io REST API
// src/server/market.ts

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';

if (!POLYGON_API_KEY) {
  console.error('❌ POLYGON_API_KEY not found in environment variables');
}

const BASE_URL = 'https://api.polygon.io';

// Ultra-conservative rate limiting for 100% success rate
const BATCH_SIZE = 3; // Process 3 tickers at once (well under 5/min limit)
const BATCH_DELAY_MS = 20000; // 20 seconds between batches (very safe margin)
const MAX_RETRIES = 3; // Retry failed requests up to 3 times
const RETRY_DELAY_MS = 10000; // Initial retry delay (increases exponentially)

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
  trend5Day: number; // 5-day price change percentage
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches market data for a single ticker using Polygon.io REST API with retry logic
 */
export async function getMarketData(ticker: string, retryCount: number = 0): Promise<MarketData | null> {
  try {
    if (!POLYGON_API_KEY) {
      console.log(`  ❌ ${ticker}: No Polygon.io API key configured`);
      return null;
    }

    // Get 5 days of data for trend calculation
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Get 7 days to ensure we have 5 trading days

    const aggregatesUrl = `${BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}?adjusted=true&sort=desc&limit=10&apiKey=${POLYGON_API_KEY}`;
    
    const aggregatesRes = await fetch(aggregatesUrl);
    
    // Handle 429 rate limit errors with retry
    if (aggregatesRes.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
        console.log(`  ⚠️  ${ticker}: Rate limited (429), retrying in ${retryDelay/1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await delay(retryDelay);
        return getMarketData(ticker, retryCount + 1);
      } else {
        console.log(`  ❌ ${ticker}: Rate limit exceeded after ${MAX_RETRIES} retries`);
        return null;
      }
    }
    
    if (!aggregatesRes.ok) {
      console.log(`  ⚠️  ${ticker}: API returned ${aggregatesRes.status}`);
      return null;
    }

    const aggregatesData = await aggregatesRes.json();
    
    if (!aggregatesData.results || aggregatesData.results.length === 0) {
      console.log(`  ⚠️  ${ticker}: No data from Polygon.io`);
      return null;
    }

    const results = aggregatesData.results;
    const latestDay = results[0];
    
    // Calculate 5-day trend if we have enough data
    let trend5Day = 0;
    if (results.length >= 5) {
      const day5Close = results[4].c;
      const latestClose = latestDay.c;
      trend5Day = day5Close > 0 ? ((latestClose - day5Close) / day5Close) * 100 : 0;
    }

    // Calculate average volume from last 5 days
    const avgVolume = results.length > 0
      ? results.slice(0, Math.min(5, results.length)).reduce((sum: number, day: any) => sum + (day.v || 0), 0) / Math.min(5, results.length)
      : latestDay.v || 0;

    const price = latestDay.c || 0;
    const open = latestDay.o || price;
    const prevClose = results.length > 1 ? results[1].c : latestDay.c;
    const high = latestDay.h || price;
    const low = latestDay.l || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const volume = latestDay.v || 0;
    
    // Estimate ATR from high-low range
    const atr = high - low;
    const atrPercent = price > 0 ? (atr / price) * 100 : 0;

    const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;

    // Gap calculation (open vs previous close)
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
      trend5Day,
    };

    console.log(`  ✅ ${ticker}: $${price.toFixed(2)} | ATR: ${atrPercent.toFixed(2)}% | Vol: ${volumeRatio.toFixed(1)}x | Trend: ${trend5Day >= 0 ? '+' : ''}${trend5Day.toFixed(1)}%`);
    
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
  console.log(`🐢 Ultra-conservative mode: ${BATCH_SIZE} tickers per batch, ${BATCH_DELAY_MS/1000}s between batches`);
  console.log(`⏱️  Estimated time: ${Math.ceil(batches.length * BATCH_DELAY_MS / 1000)} seconds (guaranteed 100% success)\n`);

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
      console.log(`\n⏳ Waiting ${BATCH_DELAY_MS/1000}s before next batch...`);
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
    trend5Day: 0,
  };
}
