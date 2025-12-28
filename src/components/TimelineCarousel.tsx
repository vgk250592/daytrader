"use client";
import { useState, useEffect, useRef } from "react";
import classNames from "classnames";

interface DayData {
  date: string;
  dayOfWeek: string;
  dayOfMonth: string;
  month: string;
  mostBuzzed: {
    ticker: string;
    buzz: number;
    mentions: number;
  };
  topGainer: {
    ticker: string;
    gain: number;
    volume: number;
  };
  correlation: boolean;
}

export default function TimelineCarousel() {
  const [data, setData] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
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
      }
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-pulse text-slate-400">Loading 30-day timeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📊 30-Day Reddit vs Market Performance
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track correlation between Reddit buzz and actual market gainers
          </p>
        </div>
        {data.length > 0 && (
          <div className="text-sm text-slate-400">
            Correlation Rate: <span className="text-green-400 font-semibold">
              {Math.round((data.filter(d => d.correlation).length / data.length) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Timeline Carousel */}
      <div className="card p-6 relative">
        {/* Scroll Buttons */}
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-3 shadow-lg transition"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-3 shadow-lg transition"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Timeline */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide px-12"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-3 min-w-max pb-2">
            {data.map((day, index) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={classNames(
                  "flex-shrink-0 w-32 p-3 rounded-lg border-2 transition-all hover:scale-105",
                  {
                    "border-blue-500 bg-blue-900/30": selectedDay?.date === day.date,
                    "border-slate-700 bg-slate-800/50 hover:border-slate-600": selectedDay?.date !== day.date,
                  }
                )}
              >
                {/* Date Header */}
                <div className="text-center mb-3 pb-2 border-b border-slate-700">
                  <div className="text-xs text-slate-400">{day.month}</div>
                  <div className="text-2xl font-bold text-white">{day.dayOfMonth}</div>
                  <div className="text-xs text-slate-400">{day.dayOfWeek}</div>
                </div>

                {/* Most Buzzed */}
                <div className="mb-2">
                  <div className="text-xs text-orange-400 mb-1">🔥 Buzzed</div>
                  <div className="text-sm font-bold text-white">{day.mostBuzzed.ticker}</div>
                  <div className="text-xs text-slate-400">{day.mostBuzzed.buzz.toFixed(2)}</div>
                </div>

                {/* Top Gainer */}
                <div>
                  <div className="text-xs text-green-400 mb-1">📈 Gainer</div>
                  <div className="text-sm font-bold text-white">{day.topGainer.ticker}</div>
                  <div className="text-xs text-green-400">+{day.topGainer.gain}%</div>
                </div>

                {/* Correlation Indicator */}
                {day.correlation && (
                  <div className="mt-2 text-center">
                    <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded">
                      ✓ Match
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {selectedDay.dayOfWeek}, {selectedDay.month} {selectedDay.dayOfMonth}
            </h3>
            {selectedDay.correlation && (
              <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
                ✓ Reddit Predicted Winner
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Most Buzzed */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="text-sm text-slate-400">Most Buzzed on Reddit</div>
                  <div className="text-2xl font-bold text-white">{selectedDay.mostBuzzed.ticker}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Buzz Score:</span>
                  <span className="text-orange-400 font-semibold">{selectedDay.mostBuzzed.buzz.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mentions:</span>
                  <span className="text-white font-semibold">{selectedDay.mostBuzzed.mentions}</span>
                </div>
              </div>
            </div>

            {/* Top Gainer */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📈</span>
                <div>
                  <div className="text-sm text-slate-400">Top Market Gainer</div>
                  <div className="text-2xl font-bold text-white">{selectedDay.topGainer.ticker}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily Gain:</span>
                  <span className="text-green-400 font-semibold">+{selectedDay.topGainer.gain}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volume:</span>
                  <span className="text-white font-semibold">{selectedDay.topGainer.volume}x avg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
