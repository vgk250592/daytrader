// API endpoint for 30-day historical data
// Returns top buzzed Reddit stock and top market gainer for each day

import { NextResponse } from "next/server";
import dayjs from "dayjs";

// This would normally fetch from database or file storage
// For now, we'll generate mock data based on recent scans
export async function GET() {
  try {
    // Generate 30 days of historical data
    const days = 30;
    const today = dayjs();
    
    const historicalData = Array.from({ length: days }, (_, i) => {
      const date = today.subtract(days - 1 - i, 'day');
      
      // Mock data - in production, this would come from stored scan results
      const mockBuzzedStocks = ['SLV', 'NVDA', 'TSLA', 'PLTR', 'MSTR', 'AMD', 'AAPL', 'MSFT', 'GOOGL', 'META'];
      const mockGainers = ['MSTR', 'PLTR', 'SLV', 'NVDA', 'TSLA', 'AMD', 'COIN', 'RIOT', 'HOOD', 'SOFI'];
      
      const buzzedStock = mockBuzzedStocks[Math.floor(Math.random() * mockBuzzedStocks.length)];
      const topGainer = mockGainers[Math.floor(Math.random() * mockGainers.length)];
      
      return {
        date: date.format('YYYY-MM-DD'),
        dayOfWeek: date.format('ddd'),
        dayOfMonth: date.format('D'),
        month: date.format('MMM'),
        mostBuzzed: {
          ticker: buzzedStock,
          buzz: Number((Math.random() * 0.5 + 0.5).toFixed(2)), // 0.5-1.0
          mentions: Math.floor(Math.random() * 500 + 100),
        },
        topGainer: {
          ticker: topGainer,
          gain: Number((Math.random() * 30 + 5).toFixed(1)), // 5-35%
          volume: Math.floor(Math.random() * 10 + 1),
        },
        correlation: buzzedStock === topGainer, // Did Reddit predict the winner?
      };
    });
    
    return NextResponse.json({
      success: true,
      data: historicalData,
      summary: {
        totalDays: days,
        correlationRate: historicalData.filter(d => d.correlation).length / days,
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
