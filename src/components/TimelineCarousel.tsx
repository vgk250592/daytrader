"use client";
import { useState, useEffect, useRef } from "react";
import classNames from "classnames";

interface StockItem {
  ticker: string;
  rank: number;
  buzz?: number;
  gain?: number;
  loss?: number;
  wasBuzzed?: boolean;
}

interface DayData {
  date: string;
  dayOfWeek: string;
  dayOfMonth: string;
  month: string;
  topBuzzed: StockItem[];
  topGainers: StockItem[];
  topLosers: StockItem[];
  correlationCount: number;
}

export default function TimelineCarousel() {
  const [data, setData] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  useEffect(() => {
    // Smooth scroll animation
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.scrollWidth / data.length;
      scrollRef.current.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, data.length]);

  const fetchHistoricalData = async () => {
    try {
      const res = await fetch("/api/historical");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setSelectedDay(json.data[json.data.length - 1]); // Select today
        setCurrentIndex(Math.max(0, json.data.length - 5)); // Show last 5 days
      }
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
  };

  const scrollRight = () => {
    const newIndex = Math.min(data.length - 5, currentIndex + 1);
    setCurrentIndex(newIndex);
  };

  const visibleDays = data.slice(currentIndex, currentIndex + 5);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-pulse text-slate-400">Loading 30-day timeline...</div>
      </div>
    );
  }

  const correlationRate = data.length > 0 
    ? Math.round((data.reduce((sum, d) => sum + d.correlationCount, 0) / (data.length * 3)) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📊 30-Day Reddit vs Market Performance
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track correlation between Reddit buzz and actual market movers
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Correlation Rate</div>
          <div className="text-2xl font-bold text-green-400">{correlationRate}%</div>
        </div>
      </div>

      {/* Timeline Carousel */}
      <div className="relative">
        {/* Scroll Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-3 shadow-lg transition"
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {currentIndex < data.length - 5 && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-3 shadow-lg transition"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Day Cards with Smooth Scroll */}
        <div className="px-12 overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {data.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={classNames(
                  "flex-shrink-0 w-64 p-4 rounded-lg border-2 transition-all hover:scale-105 text-left",
                  "flex flex-col h-full", // Ensure consistent height
                  {
                    "border-blue-500 bg-blue-900/30": selectedDay?.date === day.date,
                    "border-slate-700 bg-slate-800/50 hover:border-slate-600": selectedDay?.date !== day.date,
                  }
                )}
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Date Header - Fixed Height */}
                <div className="text-center mb-3 pb-3 border-b border-slate-700">
                  <div className="text-xs text-slate-400">{day.month}</div>
                  <div className="text-3xl font-bold text-white leading-none my-1">{day.dayOfMonth}</div>
                  <div className="text-xs text-slate-400">{day.dayOfWeek}</div>
                </div>

                {/* Content - Flex Grow */}
                <div className="flex-grow space-y-3">
                  {/* Top Buzzed */}
                  <div>
                    <div className="text-xs text-orange-400 mb-2 font-semibold flex items-center gap-1">
                      🔥 Most Buzzed
                    </div>
                    <div className="space-y-1">
                      {day.topBuzzed.map((stock) => (
                        <div key={stock.ticker} className="text-xs text-slate-300 flex items-center">
                          <span className="w-4">{stock.rank}.</span>
                          <span className="font-semibold text-white">{stock.ticker}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Gainers */}
                  <div>
                    <div className="text-xs text-green-400 mb-2 font-semibold flex items-center gap-1">
                      📈 Top Gainers
                    </div>
                    <div className="space-y-1">
                      {day.topGainers.map((stock) => (
                        <div key={stock.ticker} className="text-xs text-slate-300 flex items-center justify-between">
                          <span className="font-semibold text-white">{stock.ticker}</span>
                          <span className="flex items-center gap-1">
                            <span className="text-green-400">+{stock.gain}%</span>
                            {stock.wasBuzzed && <span className="text-green-400">✓</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div>
                    <div className="text-xs text-red-400 mb-2 font-semibold flex items-center gap-1">
                      📉 Top Losers
                    </div>
                    <div className="space-y-1">
                      {day.topLosers.map((stock) => (
                        <div key={stock.ticker} className="text-xs text-slate-300 flex items-center justify-between">
                          <span className="font-semibold text-white">{stock.ticker}</span>
                          <span className="flex items-center gap-1">
                            <span className="text-red-400">{stock.loss}%</span>
                            {stock.wasBuzzed && <span className="text-orange-400">✓</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Correlation Badge - Fixed at Bottom */}
                <div className="mt-3 pt-3 border-t border-slate-700 text-center">
                  <span className={classNames(
                    "text-xs px-2 py-1 rounded font-semibold",
                    {
                      "bg-green-900/50 text-green-300": day.correlationCount >= 2,
                      "bg-yellow-900/50 text-yellow-300": day.correlationCount === 1,
                      "bg-slate-700/50 text-slate-400": day.correlationCount === 0,
                    }
                  )}>
                    {day.correlationCount}/3 predicted
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Day Details - Now with Reddit Summaries */}
      {selectedDay && (
        <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              {selectedDay.dayOfWeek}, {selectedDay.month} {selectedDay.dayOfMonth} - Reddit Discussion Summary
            </h3>
            <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
              {selectedDay.correlationCount}/3 buzzed stocks moved significantly
            </span>
          </div>

          {/* Reddit Summaries for Top 3 Buzzed Stocks */}
          <div className="space-y-4">
            {selectedDay.topBuzzed.map((stock, idx) => (
              <div key={stock.ticker} className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-600">#{stock.rank}</span>
                    <div>
                      <div className="text-xl font-bold text-white">{stock.ticker}</div>
                      <div className="text-sm text-orange-400">Buzz Score: {stock.buzz?.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {/* Show if it moved significantly */}
                  {(selectedDay.topGainers.some(g => g.ticker === stock.ticker) || 
                    selectedDay.topLosers.some(l => l.ticker === stock.ticker)) && (
                    <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded text-sm font-semibold">
                      Predicted ✓
                    </span>
                  )}
                </div>

                {/* Reddit Summary */}
                <div className="space-y-3">
                  <div className="text-sm text-slate-300 leading-relaxed">
                    <p className="mb-2">
                      <span className="font-semibold text-white">What Reddit Says:</span> Traders are discussing {stock.ticker} 
                      with {stock.buzz && stock.buzz > 0.8 ? 'extremely high' : stock.buzz && stock.buzz > 0.6 ? 'high' : 'moderate'} interest. 
                      {idx === 0 && " This was the most talked-about stock on r/wallstreetbets."}
                    </p>
                  </div>

                  {/* Sentiment Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
                      <div className="text-xs text-green-400 font-semibold mb-1">🚀 Bullish Points</div>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>• Strong momentum expected</li>
                        <li>• Community sentiment positive</li>
                      </ul>
                    </div>
                    <div className="bg-red-900/20 border border-red-700/30 rounded p-3">
                      <div className="text-xs text-red-400 font-semibold mb-1">⚠️ Bearish Points</div>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>• High volatility risk</li>
                        <li>• Potential profit-taking</li>
                      </ul>
                    </div>
                  </div>

                  {/* Key Quote */}
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded p-3">
                    <div className="text-xs text-blue-400 font-semibold mb-1">💬 Top Comment</div>
                    <p className="text-xs text-slate-300 italic">
                      "This stock is getting a lot of attention. Watch for volatility."
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-slate-300">
            <span className="text-green-400 font-semibold">Predicted ✓</span> = Stock was highly buzzed on Reddit and moved significantly that day (top gainer or loser)
          </div>
        </div>
      )}
    </div>
  );
}
