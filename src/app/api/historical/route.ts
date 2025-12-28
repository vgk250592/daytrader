// API endpoint for 30-day historical data
// Returns top 3 buzzed stocks, top 3 gainers, and top 3 losers for each day

import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { getRecentScans, stockRecordToTickerFeature } from "@/server/database";

export async function GET() {
  try {
    // Get last 30 days of scans from database
    const recentScans = getRecentScans(30);
    
    console.log(`📊 Loaded ${recentScans.length} historical scans from database`);
    
    // Generate 30 days array
    const days = 30;
    const today = dayjs();
    
    const historicalData = Array.from({ length: days }, (_, i) => {
      const date = today.subtract(days - 1 - i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      
      // Find scan for this date in database
      const scanData = recentScans.find(s => s.scan.scan_date === dateStr);
      
      if (scanData && scanData.stocks.length > 0) {
        // Real data from database
        const tickers = scanData.stocks.map(stockRecordToTickerFeature);
        
        // Get top 3 buzzed stocks with their REAL summaries
        const topBuzzed = tickers
          .sort((a, b) => b.buzzZ - a.buzzZ)
          .slice(0, 3)
          .map((item, index) => ({
            ticker: item.ticker,
            rank: index + 1,
            buzz: item.buzzZ,
            sentiment: item.sentiment,
            redditSummary: item.redditSummary || null,
          }));

        // Get top 3 gainers (by changePercent)
        const topGainers = tickers
          .filter(item => item.changePercent && item.changePercent > 0)
          .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
          .slice(0, 3)
          .map(item => ({
            ticker: item.ticker,
            gain: (item.changePercent || 0).toFixed(1),
            wasBuzzed: topBuzzed.some(b => b.ticker === item.ticker),
          }));

        // Get top 3 losers (by changePercent)
        const topLosers = tickers
          .filter(item => item.changePercent && item.changePercent < 0)
          .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
          .slice(0, 3)
          .map(item => ({
            ticker: item.ticker,
            loss: (item.changePercent || 0).toFixed(1),
            wasBuzzed: topBuzzed.some(b => b.ticker === item.ticker),
          }));

        // Calculate correlation
        const significantMovers = topBuzzed.filter(b => 
          topGainers.some(g => g.ticker === b.ticker) || 
          topLosers.some(l => l.ticker === b.ticker)
        ).length;

        return {
          date: dateStr,
          dayOfWeek: date.format('ddd'),
          dayOfMonth: date.format('D'),
          month: date.format('MMM'),
          topBuzzed,
          topGainers,
          topLosers,
          correlationCount: significantMovers,
          hasRealData: true,
        };
      }
      
      // No data for this date - return placeholder
      return {
        date: dateStr,
        dayOfWeek: date.format('ddd'),
        dayOfMonth: date.format('D'),
        month: date.format('MMM'),
        topBuzzed: [],
        topGainers: [],
        topLosers: [],
        correlationCount: 0,
        hasRealData: false,
      };
    });
    
    // Calculate correlation rate from real data only
    const daysWithData = historicalData.filter(d => d.hasRealData);
    const totalBuzzed = daysWithData.length * 3;
    const totalCorrelated = daysWithData.reduce((sum, d) => sum + d.correlationCount, 0);
    const correlationRate = totalBuzzed > 0 ? totalCorrelated / totalBuzzed : 0;
    
    return NextResponse.json({
      success: true,
      data: historicalData,
      summary: {
        totalDays: days,
        daysWithRealData: daysWithData.length,
        correlationRate: Number(correlationRate.toFixed(2)),
        averageCorrelatedPerDay: daysWithData.length > 0 
          ? Number((totalCorrelated / daysWithData.length).toFixed(1))
          : 0,
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
