"use client";
import { useEffect, useMemo, useState } from "react";
import TickerTable from "@/components/TickerTable";
import type { TickerFeature } from "@/lib/types";

export default function Page() {
  const [data, setData] = useState<TickerFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [scanTime, setScanTime] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/run-daily", { method: "POST" });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        setErr(typeof data === "string" ? data : (data.error || "Unknown server error"));
        setData([]);
        return;
      }
      
      setData(Array.isArray(data.rows) ? data.rows : []);
      setLastUpdate(data.timestamp || new Date().toISOString());
      setScanTime(data.scanTime || null);
    } catch (e: any) {
      setErr(String(e));
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // Auto-load data on first load
  useEffect(() => {
    loadData();
  }, []);

  const safe = Array.isArray(data) ? data : [];
  const day = useMemo(() => safe.filter(d => d.list === "DAY_TRADE"), [safe]);
  const swing = useMemo(() => safe.filter(d => d.list === "SWING"), [safe]);

  // Calculate insights
  const topPick = useMemo(() => {
    return safe.length > 0 ? safe.reduce((max, curr) => curr.score > max.score ? curr : max) : null;
  }, [safe]);

  const mostBuzzed = useMemo(() => {
    return safe.length > 0 ? safe.reduce((max, curr) => curr.buzzZ > max.buzzZ ? curr : max) : null;
  }, [safe]);

  const mostBullish = useMemo(() => {
    return safe.length > 0 ? safe.reduce((max, curr) => curr.sentiment > max.sentiment ? curr : max) : null;
  }, [safe]);

  const avgSentiment = useMemo(() => {
    if (safe.length === 0) return 0;
    return safe.reduce((sum, t) => sum + t.sentiment, 0) / safe.length;
  }, [safe]);

  // Format scan time for display
  const scanTimeDisplay = scanTime 
    ? scanTime.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Latest';

  // Format last update time
  const lastUpdateDisplay = lastUpdate 
    ? new Date(lastUpdate).toLocaleString()
    : '';

  return (
    <div className="container py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reddit Stock Scanner</h1>
          <p className="text-sm text-slate-400">
            Daily Reddit buzz + sentiment → day trading & swing ideas
          </p>
          {lastUpdateDisplay && (
            <p className="text-xs text-slate-500 mt-1">
              📊 {scanTimeDisplay} scan • Last updated: {lastUpdateDisplay}
            </p>
          )}
        </div>
        <div className="space-x-2">
          <button className="btn btn-sm" onClick={loadData} disabled={loading}>
            {loading ? "Loading..." : "🔄 Refresh"}
          </button>
          <a className="btn btn-sm" href="https://www.reddit.com/r/wallstreetbets/" target="_blank" rel="noreferrer">
            Open Reddit
          </a>
        </div>
      </header>

      {loading && safe.length === 0 && (
        <div className="card p-4 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span>Loading latest scan results...</span>
          </div>
        </div>
      )}

      {err && <div className="card p-4 text-red-300">API error: {err}</div>}
      
      {safe.length === 0 && !err && !loading && (
        <div className="card p-4 text-slate-300">
          No scan results available yet. Automated scans run 4x daily at market open, midday, close, and after hours.
        </div>
      )}

      {/* Insights Panel */}
      {safe.length > 0 && (
        <div className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>💡</span> Today's Insights
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {/* Top Pick */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="text-slate-400 text-xs mb-1">🎯 Top Pick</div>
              <div className="text-xl font-bold text-blue-400">{topPick?.ticker}</div>
              <div className="text-xs text-slate-300 mt-1">
                Score: {topPick?.score.toFixed(2)} | Buzz: {topPick?.buzzZ.toFixed(1)}z | Sentiment: {((topPick?.sentiment || 0) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {topPick && topPick.score >= 0.65 ? "Strong day-trade candidate" : "Swing trade candidate"}
              </div>
            </div>

            {/* Most Buzzed */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="text-slate-400 text-xs mb-1">🔥 Most Buzzed</div>
              <div className="text-xl font-bold text-orange-400">{mostBuzzed?.ticker}</div>
              <div className="text-xs text-slate-300 mt-1">
                Buzz: {mostBuzzed?.buzzZ.toFixed(2)}z (viral on Reddit)
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {mostBuzzed && mostBuzzed.buzzZ > 2.0 ? "Extremely high mentions" : "Above average mentions"}
              </div>
            </div>

            {/* Most Bullish */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="text-slate-400 text-xs mb-1">🚀 Most Bullish</div>
              <div className="text-xl font-bold text-green-400">{mostBullish?.ticker}</div>
              <div className="text-xs text-slate-300 mt-1">
                Sentiment: {((mostBullish?.sentiment || 0) * 100).toFixed(0)}% positive
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {mostBullish && mostBullish.sentiment > 0.8 ? "Extremely bullish sentiment" : "Bullish sentiment"}
              </div>
            </div>
          </div>

          {/* Market Mood */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-400">Overall Market Mood:</span>
                <span className={`ml-2 font-semibold ${avgSentiment > 0.6 ? 'text-green-400' : avgSentiment > 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {avgSentiment > 0.6 ? '😊 Bullish' : avgSentiment > 0.3 ? '😐 Neutral' : '😟 Bearish'}
                </span>
                <span className="ml-1 text-slate-400">({(avgSentiment * 100).toFixed(0)}% positive)</span>
              </div>
              <div className="text-xs text-slate-400">
                Based on {safe.length} tickers from r/wallstreetbets
              </div>
            </div>
          </div>

          {/* Trading Tips */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-xs text-slate-300">
            <div className="font-semibold text-blue-300 mb-1">💡 How to Use This Data:</div>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Day-Trade Watch</strong>: High scores (0.65+) = momentum plays for 1-3 days</li>
              <li><strong>Swing Candidates</strong>: Medium scores (0.55-0.64) = hold for 1-2 weeks</li>
              <li><strong>Buzz z</strong>: 2.0+ = viral on Reddit, high volume expected</li>
              <li><strong>Sentiment</strong>: Green = bullish, Red = bearish (or short opportunity)</li>
              <li><strong>Trend</strong>: ↑↑ = strong uptrend, ↓↓ = strong downtrend, → = flat</li>
              <li><strong>⚠️ Warning</strong>: Verify tickers are real stocks before trading. Some may be Reddit slang (e.g., "TLDR", "EPS")</li>
            </ul>
          </div>
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-6">
        <TickerTable title="Day-Trade Watch" rows={day} />
        <TickerTable title="Swing Candidates" rows={swing} />
      </section>

      <footer className="text-xs text-slate-500">
        Experimental tool. Not financial advice. Paper-trade first. • Automated scans run 4x daily at 9:30 AM, 12:00 PM, 4:00 PM, and 8:00 PM EST.
      </footer>
    </div>
  );
}
