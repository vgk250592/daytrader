"use client";

import { useEffect, useState } from "react";
import TickerTable from "@/components/TickerTable";
import TimelineCarousel from "@/components/TimelineCarousel";
import type { TickerFeature } from "@/lib/types";

export default function HomePage() {
  const [tickers, setTickers] = useState<TickerFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadCachedData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadCachedData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadCachedData = async () => {
    try {
      const res = await fetch("/api/run-daily");
      const data = await res.json();
      
      if (data.success && data.cached) {
        setTickers(data.tickers);
        setLastUpdate(data.scanTime);
        setError("");
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadCachedData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Reddit Stock Scanner
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                AI-powered analysis of r/wallstreetbets
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="text-right">
                  <div className="text-xs text-slate-400">Last Updated</div>
                  <div className="text-sm font-semibold text-slate-300">{lastUpdate}</div>
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="card p-4 bg-red-900/20 border border-red-500/50">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* 30-Day Timeline */}
        <TimelineCarousel />

        {/* Today's Insights */}
        {tickers.length > 0 && (
          <div className="card p-6">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Top Pick */}
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-4 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="text-sm text-purple-300">Top Pick</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{tickers[0].ticker}</div>
                <div className="text-sm text-slate-300">
                  Buzz: {tickers[0].buzzZ.toFixed(2)} | Sentiment: {(tickers[0].sentiment*100).toFixed(0)}%
                </div>
              </div>

              {/* Most Buzzed */}
              <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔥</span>
                  <span className="text-sm text-orange-300">Most Buzzed</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {[...tickers].sort((a, b) => b.buzzZ - a.buzzZ)[0].ticker}
                </div>
                <div className="text-sm text-slate-300">
                  Buzz: {[...tickers].sort((a, b) => b.buzzZ - a.buzzZ)[0].buzzZ.toFixed(2)} (viral on Reddit)
                </div>
              </div>

              {/* Most Bullish */}
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-sm text-green-300">Most Bullish</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {[...tickers].sort((a, b) => b.sentiment - a.sentiment)[0].ticker}
                </div>
                <div className="text-sm text-slate-300">
                  Sentiment: {([...tickers].sort((a, b) => b.sentiment - a.sentiment)[0].sentiment*100).toFixed(0)}% positive
                </div>
              </div>
            </div>

            {/* Overall Market Mood */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">😊</span>
                  <div>
                    <div className="text-sm text-slate-400">Overall Market Mood</div>
                    <div className="text-lg font-semibold text-green-400">
                      Bullish ({Math.round((tickers.filter(t => t.sentiment > 0).length / tickers.length) * 100)}% positive)
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-400">
                  Based on {tickers.length} tickers from r/wallstreetbets
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Table */}
        {tickers.length > 0 && (
          <TickerTable rows={tickers} title="🔥 Today's Top Stocks" />
        )}

        {/* How to Use Guide */}
        <div className="card p-6 bg-slate-800/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            💡 How to Use This Data
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-blue-400 mb-2">📊 Metrics Explained:</div>
              <ul className="space-y-1 text-slate-300">
                <li><strong>Buzz:</strong> 0-1 scale, 1.0 = maximum Reddit mentions</li>
                <li><strong>Sentiment:</strong> -100% (bearish) to +100% (bullish)</li>
                <li><strong>Gap%:</strong> Price change from yesterday's close</li>
                <li><strong>Vol x:</strong> Volume vs 5-day average</li>
                <li><strong>ATR%:</strong> Daily volatility (higher = bigger swings)</li>
                <li><strong>5D Trend:</strong> 5-day price change percentage</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-orange-400 mb-2">⚠️ Important Notes:</div>
              <ul className="space-y-1 text-slate-300">
                <li>✓ Data updates 4x daily (market open, midday, close, after hours)</li>
                <li>✓ Click "View" in Reddit column for AI-powered summaries</li>
                <li>✓ Verify tickers before trading (some may be slang/memes)</li>
                <li>✓ High buzz ≠ good investment. Do your own research!</li>
                <li>✓ Use 30-day timeline to see Reddit's prediction accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-400">
          <p>Data from r/wallstreetbets • Market data from Polygon.io • AI summaries from GPT-4</p>
          <p className="mt-2">⚠️ Not financial advice. Trade at your own risk.</p>
        </div>
      </footer>
    </div>
  );
}
