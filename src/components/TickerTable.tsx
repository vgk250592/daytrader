
"use client";
import type { TickerFeature } from "@/lib/types";
import classNames from "classnames";
import { useState } from "react";

export default function TickerTable({ rows, title }: { rows: TickerFeature[]; title: string; }) {
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

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
              <th className="text-left text-slate-300 font-semibold py-3 px-3">
                Ticker
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3" title="Reddit mentions vs average (z-score). 2.0+ = viral">
                Buzz z
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3" title="Overall sentiment from Reddit comments (-100% to +100%)">
                Sentiment
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3" title="Price change from yesterday's close">
                Gap%
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3" title="Volume vs 5-day average. 2.0x = double normal volume">
                Vol x
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3" title="Average True Range - daily volatility as % of price">
                ATR%
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3" title="5-day price trend percentage">
                5D Trend
              </th>
              <th className="text-left text-slate-300 font-semibold py-3 px-3">
                Reddit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const trend5Day = r.trend5Day || 0;
              const trendColor = trend5Day > 5 ? 'text-green-400' : 
                                 trend5Day > 0 ? 'text-green-300' :
                                 trend5Day < -5 ? 'text-red-400' :
                                 trend5Day < 0 ? 'text-red-300' :
                                 'text-slate-400';
              
              const isExpanded = expandedTicker === r.ticker;
              const hasSummary = r.redditSummary && r.redditSummary.summary;
              
              return (
                <>
                  <tr 
                    key={r.ticker} 
                    className={classNames(
                      "border-b border-slate-700/30 hover:bg-slate-700/20 transition",
                      { "bg-slate-700/30": isExpanded }
                    )}
                  >
                    <td className="font-semibold py-3 px-3">{r.ticker}</td>
                    <td className="py-3 px-3">{r.buzzZ.toFixed(2)}</td>
                    <td className={classNames("py-3 px-3", {
                      "text-green-400": r.sentiment > 0.3, 
                      "text-red-400": r.sentiment < -0.3,
                      "text-slate-400": r.sentiment >= -0.3 && r.sentiment <= 0.3
                    })}>
                      {(r.sentiment*100).toFixed(0)}%
                    </td>
                    <td className={classNames("py-3 px-3", {
                      "text-green-400": r.gapPct > 2,
                      "text-red-400": r.gapPct < -2
                    })}>
                      {r.gapPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      {r.volAbnormal > 0 ? `${r.volAbnormal.toFixed(1)}x` : 'N/A'}
                    </td>
                    <td className="py-3 px-3">{(r.atrPct*100).toFixed(1)}%</td>
                    <td className={classNames("py-3 px-3 font-semibold", trendColor)}>
                      {trend5Day >= 0 ? '+' : ''}{trend5Day.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      {hasSummary ? (
                        <button
                          onClick={() => setExpandedTicker(isExpanded ? null : r.ticker)}
                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                        >
                          {isExpanded ? '▼ Hide' : '▶ View'}
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expandable Reddit Summary Row */}
                  {isExpanded && hasSummary && (
                    <tr className="bg-slate-800/50 border-b border-slate-700/30">
                      <td colSpan={9} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-blue-300">💬 What Reddit Says</h4>
                            <span className={classNames(
                              "text-xs px-2 py-0.5 rounded",
                              {
                                "bg-green-900/30 text-green-300": r.redditSummary?.overallSentiment === 'bullish',
                                "bg-red-900/30 text-red-300": r.redditSummary?.overallSentiment === 'bearish',
                                "bg-slate-700 text-slate-300": r.redditSummary?.overallSentiment === 'neutral',
                              }
                            )}>
                              {r.redditSummary?.overallSentiment?.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {r.redditSummary?.summary}
                          </p>

                          {r.redditSummary?.bullishPoints && r.redditSummary.bullishPoints.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-green-400 mb-1">🚀 Bullish Points:</div>
                              <ul className="text-xs text-slate-300 space-y-1 ml-4">
                                {r.redditSummary.bullishPoints.map((point, i) => (
                                  <li key={i} className="list-disc">{point}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {r.redditSummary?.bearishPoints && r.redditSummary.bearishPoints.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-red-400 mb-1">⚠️ Bearish Points:</div>
                              <ul className="text-xs text-slate-300 space-y-1 ml-4">
                                {r.redditSummary.bearishPoints.map((point, i) => (
                                  <li key={i} className="list-disc">{point}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {r.redditSummary?.keyQuotes && r.redditSummary.keyQuotes.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-slate-400 mb-1">💭 Key Quotes:</div>
                              <div className="space-y-2">
                                {r.redditSummary.keyQuotes.map((quote, i) => (
                                  <blockquote key={i} className="text-xs text-slate-400 italic border-l-2 border-slate-600 pl-3">
                                    "{quote}"
                                  </blockquote>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.redditSummary?.postLinks && r.redditSummary.postLinks.length > 0 && (
                            <div className="pt-2 border-t border-slate-700">
                              <div className="text-xs text-slate-400">
                                📎 Top discussions:{' '}
                                {r.redditSummary.postLinks.slice(0, 3).map((link, i) => (
                                  <span key={i}>
                                    <a 
                                      href={link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 underline"
                                    >
                                      #{i + 1}
                                    </a>
                                    {i < Math.min(2, r.redditSummary!.postLinks.length - 1) && ', '}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
