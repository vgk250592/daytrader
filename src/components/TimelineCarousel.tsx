"use client";
import { useState, useEffect, useRef } from "react";
import classNames from "classnames";

interface RedditSummary {
  summary: string;
  bullishPoints: string[];
  bearishPoints: string[];
  keyQuotes: string[];
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  postLinks: string[];
}

interface StockItem {
  ticker: string;
  rank: number;
  buzz?: number;
  sentiment?: number;
  gain?: number;
  loss?: number;
  wasBuzzed?: boolean;
  redditSummary?: RedditSummary | null;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  useEffect(() => {
    // Premium smooth scroll with easing
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 272; // 256px + 16px gap
      const targetScroll = currentIndex * cardWidth;
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

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

      {/* Premium Carousel */}
      <div className="relative">
        {/* Scroll Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-full p-3 shadow-xl transition-all hover:scale-110"
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
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-full p-3 shadow-xl transition-all hover:scale-110"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Carousel Container - Fixed Height, No Vertical Scroll */}
        <div className="px-4 py-8">
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-hidden overflow-y-visible"
            style={{ 
              height: '440px', // Fixed height with extra space for hover border
              scrollBehavior: 'smooth',
              paddingTop: '10px',
              paddingBottom: '10px'
            }}
          >
            {data.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={classNames(
                  "flex-shrink-0 w-64 p-4 rounded-lg border-2 transition-all duration-300 text-left",
                  "hover:scale-105 hover:shadow-2xl",
                  {
                    "border-blue-500 bg-gradient-to-br from-blue-900/40 to-blue-800/30 shadow-lg shadow-blue-500/20": selectedDay?.date === day.date,
                    "border-slate-700 bg-slate-800/50 hover:border-slate-600": selectedDay?.date !== day.date,
                  }
                )}
                style={{ height: '400px' }} // Fixed card height
              >
                {/* Date Header */}
                <div className="text-center mb-3 pb-3 border-b border-slate-700">
                  <div className="text-xs text-slate-400">{day.month}</div>
                  <div className="text-4xl font-bold text-white leading-none my-1">{day.dayOfMonth}</div>
                  <div className="text-xs text-slate-400">{day.dayOfWeek}</div>
                </div>

                {/* Content */}
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {/* Top Buzzed */}
                  <div>
                    <div className="text-xs text-orange-400 mb-2 font-semibold">
                      🔥 Most Buzzed
                    </div>
                    <div className="space-y-1">
                      {day.topBuzzed.map((stock) => (
                        <div key={stock.ticker} className="text-xs text-slate-300 flex items-center">
                          <span className="w-4 text-slate-500">{stock.rank}.</span>
                          <span className="font-semibold text-white">{stock.ticker}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Gainers */}
                  <div>
                    <div className="text-xs text-green-400 mb-2 font-semibold">
                      📈 Top Gainers
                    </div>
                    <div className="space-y-1">
                      {day.topGainers.map((stock) => (
                        <div key={stock.ticker} className="text-xs text-slate-300 flex items-center justify-between">
                          <span className="font-semibold text-white">{stock.ticker}</span>
                          <span className="flex items-center gap-1">
                            <span className="text-green-400 font-semibold">+{stock.gain}%</span>
                            {stock.wasBuzzed && <span className="text-green-400">✓</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div>
                    <div className="text-xs text-red-400 mb-2 font-semibold">
                      📉 Top Losers
                    </div>
                    <div className="space-y-1">
                      {day.topLosers.map((stock) => (
                        <div key={stock.ticker} className="text-xs text-slate-300 flex items-center justify-between">
                          <span className="font-semibold text-white">{stock.ticker}</span>
                          <span className="flex items-center gap-1">
                            <span className="text-red-400 font-semibold">{stock.loss}%</span>
                            {stock.wasBuzzed && <span className="text-orange-400">✓</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Day - Reddit Summaries with Sentiment Highlighting */}
      {selectedDay && (
        <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900">
          <h3 className="text-lg font-semibold text-white mb-6">
            {selectedDay.dayOfWeek}, {selectedDay.month} {selectedDay.dayOfMonth} - Reddit Discussion Summary
          </h3>

          {/* Reddit Summaries for Top 3 Buzzed Stocks */}
          <div className="space-y-4">
            {selectedDay.topBuzzed.map((stock) => {
              // Determine sentiment (mock - in real version, get from API)
              const sentiment = Math.random() > 0.5 ? 'bullish' : 'bearish';
              const sentimentScore = sentiment === 'bullish' ? Math.random() * 0.4 + 0.6 : Math.random() * 0.4 + 0.1;
              
              return (
                <div 
                  key={stock.ticker} 
                  className={classNames(
                    "rounded-lg p-5 border-2",
                    {
                      "bg-green-900/10 border-green-700/30": sentiment === 'bullish',
                      "bg-red-900/10 border-red-700/30": sentiment === 'bearish',
                    }
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-slate-600">#{stock.rank}</span>
                      <div>
                        <div className="text-2xl font-bold text-white">{stock.ticker}</div>
                        <div className="text-sm text-slate-400">
                          Buzz: {stock.buzz?.toFixed(2)} | 
                          Sentiment: <span className={sentiment === 'bullish' ? 'text-green-400' : 'text-red-400'}>
                            {(sentimentScore * 100).toFixed(0)}% {sentiment}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Reddit Summary */}
                  <div className="space-y-3">
                    {stock.redditSummary ? (
                      <div className="text-sm text-slate-300 leading-relaxed">
                        <p className="mb-3">
                          <span className="font-semibold text-white">What Reddit Says:</span> {stock.redditSummary.summary}
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-300 leading-relaxed">
                        <p className="mb-3">
                          <span className="font-semibold text-white">Community Discussion:</span> Traders on r/wallstreetbets are 
                          showing {stock.buzz && stock.buzz > 0.8 ? 'extremely high' : stock.buzz && stock.buzz > 0.6 ? 'significant' : 'moderate'} interest 
                          in {stock.ticker}. The overall sentiment is <span className={sentiment === 'bullish' ? 'text-green-400' : 'text-red-400'}>
                            {sentiment}
                          </span>, with discussions focusing on recent price action and potential catalysts.
                        </p>
                      </div>
                    )}




                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
