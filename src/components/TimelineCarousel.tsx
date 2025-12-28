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

        {/* Day Cards */}
        <div className="px-12">
          <div className="grid grid-cols-5 gap-4">
            {visibleDays.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={classNames(
                  "p-4 rounded-lg border-2 transition-all hover:scale-105 text-left",
                  {
                    "border-blue-500 bg-blue-900/30": selectedDay?.date === day.date,
                    "border-slate-700 bg-slate-800/50 hover:border-slate-600": selectedDay?.date !== day.date,
                  }
                )}
              >
                {/* Date Header */}
                <div className="text-center mb-3 pb-3 border-b border-slate-700">
                  <div className="text-xs text-slate-400">{day.month}</div>
                  <div className="text-3xl font-bold text-white">{day.dayOfMonth}</div>
                  <div className="text-xs text-slate-400">{day.dayOfWeek}</div>
                </div>

                {/* Top Buzzed */}
                <div className="mb-3">
                  <div className="text-xs text-orange-400 mb-2 font-semibold">🔥 Most Buzzed</div>
                  <div className="space-y-1">
                    {day.topBuzzed.map((stock) => (
                      <div key={stock.ticker} className="text-xs text-slate-300">
                        {stock.rank}. <span className="font-semibold text-white">{stock.ticker}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Gainers */}
                <div className="mb-3">
                  <div className="text-xs text-green-400 mb-2 font-semibold">📈 Top Gainers</div>
                  <div className="space-y-1">
                    {day.topGainers.map((stock) => (
                      <div key={stock.ticker} className="text-xs text-slate-300 flex items-center gap-1">
                        <span className="font-semibold text-white">{stock.ticker}</span>
                        <span className="text-green-400">+{stock.gain}%</span>
                        {stock.wasBuzzed && <span className="text-green-400">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Losers */}
                <div>
                  <div className="text-xs text-red-400 mb-2 font-semibold">📉 Top Losers</div>
                  <div className="space-y-1">
                    {day.topLosers.map((stock) => (
                      <div key={stock.ticker} className="text-xs text-slate-300 flex items-center gap-1">
                        <span className="font-semibold text-white">{stock.ticker}</span>
                        <span className="text-red-400">{stock.loss}%</span>
                        {stock.wasBuzzed && <span className="text-orange-400">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correlation Badge */}
                {day.correlationCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-center">
                    <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                      {day.correlationCount}/3 predicted
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              {selectedDay.dayOfWeek}, {selectedDay.month} {selectedDay.dayOfMonth}
            </h3>
            <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
              {selectedDay.correlationCount}/3 buzzed stocks moved significantly
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Most Buzzed */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔥</span>
                <div className="text-sm font-semibold text-orange-300">Most Buzzed on Reddit</div>
              </div>
              <div className="space-y-2">
                {selectedDay.topBuzzed.map((stock) => (
                  <div key={stock.ticker} className="flex items-center justify-between text-sm">
                    <span className="text-white font-semibold">{stock.rank}. {stock.ticker}</span>
                    <span className="text-orange-400">{stock.buzz?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Gainers */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📈</span>
                <div className="text-sm font-semibold text-green-300">Top Market Gainers</div>
              </div>
              <div className="space-y-2">
                {selectedDay.topGainers.map((stock) => (
                  <div key={stock.ticker} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{stock.rank}. {stock.ticker}</span>
                      {stock.wasBuzzed && (
                        <span className="text-green-400 text-xs" title="Was in top 3 buzzed">✓</span>
                      )}
                    </div>
                    <span className="text-green-400 font-semibold">+{stock.gain}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Losers */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📉</span>
                <div className="text-sm font-semibold text-red-300">Top Market Losers</div>
              </div>
              <div className="space-y-2">
                {selectedDay.topLosers.map((stock) => (
                  <div key={stock.ticker} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{stock.rank}. {stock.ticker}</span>
                      {stock.wasBuzzed && (
                        <span className="text-orange-400 text-xs" title="Was in top 3 buzzed">✓</span>
                      )}
                    </div>
                    <span className="text-red-400 font-semibold">{stock.loss}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-slate-300">
            <span className="text-green-400">✓</span> = Stock was in top 3 buzzed on Reddit and moved significantly that day
          </div>
        </div>
      )}
    </div>
  );
}
