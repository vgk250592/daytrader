
"use client";
import type { TickerFeature } from "@/lib/types";
import Sparkline from "./Sparkline";
import classNames from "classnames";

export default function TickerTable({ rows, title }: { rows: TickerFeature[]; title: string; }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="badge">{rows.length} tickers</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Ticker</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Score</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Buzz z</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Sentiment</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Gap%</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Vol x</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">ATR%</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">News</th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                <td className="font-semibold py-3 px-3">{r.ticker}</td>
                <td className="py-3 px-3">{r.score.toFixed(2)}</td>
                <td className="py-3 px-3">{r.buzzZ.toFixed(2)}</td>
                <td className={classNames("py-3 px-3", {"text-green-400": r.sentiment > 0, "text-red-400": r.sentiment < 0})}>
                  {(r.sentiment*100).toFixed(0)}%
                </td>
                <td className="py-3 px-3">{(r.gapPct*100).toFixed(1)}%</td>
                <td className="py-3 px-3">{r.volAbnormal.toFixed(1)}x</td>
                <td className="py-3 px-3">{(r.atrPct*100).toFixed(1)}%</td>
                <td className="py-3 px-3">{r.newsCount}</td>
                <td className="py-3 px-3"><Sparkline data={[0,0.2,0.4,0.1,0.6,0.5,0.8].map(v=>({v}))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
