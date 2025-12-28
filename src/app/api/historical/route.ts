// API endpoint for 30-day historical data
// Returns top 3 buzzed stocks, top 3 gainers, and top 3 losers for each day

import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { loadScanResults } from "@/server/cache-manager";

export async function GET() {
  try {
    // Load today's real scan results
    const cache = await loadScanResults();
    
    // Generate 30 days of historical data
    const days = 30;
    const today = dayjs();
    
    const historicalData = Array.from({ length: days }, (_, i) => {
      const date = today.subtract(days - 1 - i, 'day');
      const isToday = i === days - 1;
      
      // For today, use real cached data if available
      if (isToday && cache && cache.data && cache.data.length > 0) {
        // Get top 3 buzzed stocks with their REAL summaries
        const topBuzzed = cache.data
          .sort((a, b) => b.buzzZ - a.buzzZ)
          .slice(0, 3)
          .map((item, index) => ({
            ticker: item.ticker,
            rank: index + 1,
            buzz: item.buzzZ,
            sentiment: item.sentiment,
            redditSummary: item.redditSummary || null,
          }));

        // Get top 3 gainers (by gap%)
        const topGainers = cache.data
          .filter(item => item.gapPct > 0)
          .sort((a, b) => b.gapPct - a.gapPct)
          .slice(0, 3)
          .map(item => ({
            ticker: item.ticker,
            gain: item.gapPct.toFixed(1),
            wasBuzzed: topBuzzed.some(b => b.ticker === item.ticker),
          }));

        // Get top 3 losers (by gap%)
        const topLosers = cache.data
          .filter(item => item.gapPct < 0)
          .sort((a, b) => a.gapPct - b.gapPct)
          .slice(0, 3)
          .map(item => ({
            ticker: item.ticker,
            loss: item.gapPct.toFixed(1),
            wasBuzzed: topBuzzed.some(b => b.ticker === item.ticker),
          }));

        // Calculate correlation
        const significantMovers = topBuzzed.filter(b => 
          topGainers.some(g => g.ticker === b.ticker) || 
          topLosers.some(l => l.ticker === b.ticker)
        ).length;

        return {
          date: date.format('YYYY-MM-DD'),
          dayOfWeek: date.format('ddd'),
          dayOfMonth: date.format('D'),
          month: date.format('MMM'),
          topBuzzed,
          topGainers,
          topLosers,
          correlationCount: significantMovers,
        };
      }
      
      // For past days, generate mock data (no summaries)
      const allStocks = ['SLV', 'NVDA', 'TSLA', 'PLTR', 'MSTR', 'AMD', 'AAPL', 'MSFT', 'GOOGL', 'META', 'COIN', 'SOFI', 'RIOT', 'HOOD', 'SNAP'];
      
      const shuffled = [...allStocks].sort(() => Math.random() - 0.5);
      const topBuzzed = shuffled.slice(0, 3).map((ticker, idx) => ({
        ticker,
        buzz: Number((0.9 - idx * 0.15).toFixed(2)),
        rank: idx + 1,
        sentiment: Math.random() * 2 - 1,
        redditSummary: null, // No summaries for past days
      }));
      
      const gainers = [...allStocks].sort(() => Math.random() - 0.5).slice(0, 3).map((ticker, idx) => {
        const wasBuzzed = topBuzzed.some(b => b.ticker === ticker);
        return {
          ticker,
          gain: Number((25 - idx * 5 - Math.random() * 3).toFixed(1)),
          rank: idx + 1,
          wasBuzzed,
        };
      });
      
      const losers = [...allStocks]
        .filter(t => !gainers.some(g => g.ticker === t))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((ticker, idx) => {
          const wasBuzzed = topBuzzed.some(b => b.ticker === ticker);
          return {
            ticker,
            loss: Number((-15 + idx * 3 + Math.random() * 2).toFixed(1)),
            rank: idx + 1,
            wasBuzzed,
          };
        });
      
      const buzzedTickers = topBuzzed.map(b => b.ticker);
      const performerTickers = [...gainers.map(g => g.ticker), ...losers.map(l => l.ticker)];
      const correlationCount = buzzedTickers.filter(t => performerTickers.includes(t)).length;
      
      return {
        date: date.format('YYYY-MM-DD'),
        dayOfWeek: date.format('ddd'),
        dayOfMonth: date.format('D'),
        month: date.format('MMM'),
        topBuzzed,
        topGainers: gainers,
        topLosers: losers,
        correlationCount,
      };
    });
    
    const totalBuzzed = days * 3;
    const totalCorrelated = historicalData.reduce((sum, d) => sum + d.correlationCount, 0);
    const correlationRate = totalCorrelated / totalBuzzed;
    
    return NextResponse.json({
      success: true,
      data: historicalData,
      summary: {
        totalDays: days,
        correlationRate: Number(correlationRate.toFixed(2)),
        averageCorrelatedPerDay: Number((totalCorrelated / days).toFixed(1)),
      }
    });
    
  } catch (error) {
    console.error("Historical data fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
