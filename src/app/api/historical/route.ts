// API endpoint for 30-day historical data
// Returns top 3 buzzed stocks, top 3 gainers, and top 3 losers for each day

import { NextResponse } from "next/server";
import dayjs from "dayjs";

export async function GET() {
  try {
    // Generate 30 days of historical data
    const days = 30;
    const today = dayjs();
    
    const historicalData = Array.from({ length: days }, (_, i) => {
      const date = today.subtract(days - 1 - i, 'day');
      
      // Mock stocks pool
      const allStocks = ['SLV', 'NVDA', 'TSLA', 'PLTR', 'MSTR', 'AMD', 'AAPL', 'MSFT', 'GOOGL', 'META', 'COIN', 'SOFI', 'RIOT', 'HOOD', 'SNAP'];
      
      // Generate top 3 most buzzed
      const shuffled = [...allStocks].sort(() => Math.random() - 0.5);
      const topBuzzed = shuffled.slice(0, 3).map((ticker, idx) => ({
        ticker,
        buzz: Number((0.9 - idx * 0.15).toFixed(2)), // 0.9, 0.75, 0.6
        rank: idx + 1,
      }));
      
      // Generate top 3 gainers
      const gainers = [...allStocks].sort(() => Math.random() - 0.5).slice(0, 3).map((ticker, idx) => {
        const wasBuzzed = topBuzzed.some(b => b.ticker === ticker);
        return {
          ticker,
          gain: Number((25 - idx * 5 - Math.random() * 3).toFixed(1)), // 20-25%, 15-20%, 10-15%
          rank: idx + 1,
          wasBuzzed,
        };
      });
      
      // Generate top 3 losers
      const losers = [...allStocks]
        .filter(t => !gainers.some(g => g.ticker === t))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((ticker, idx) => {
          const wasBuzzed = topBuzzed.some(b => b.ticker === ticker);
          return {
            ticker,
            loss: Number((-15 + idx * 3 + Math.random() * 2).toFixed(1)), // -15 to -10%, -12 to -7%, -9 to -4%
            rank: idx + 1,
            wasBuzzed,
          };
        });
      
      // Calculate correlation: how many of top 3 buzzed ended up in top performers (gainers or losers)?
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
        correlationCount, // 0-3: how many buzzed stocks actually moved significantly
      };
    });
    
    // Calculate overall correlation rate
    const totalBuzzed = days * 3; // 3 buzzed stocks per day
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
