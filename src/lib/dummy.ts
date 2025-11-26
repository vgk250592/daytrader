
import type { TickerFeature } from "./types";

export const sampleToday: TickerFeature[] = [
  { ticker: "NVDA", score: 0.72, buzzZ: 2.4, sentiment: 0.35, gapPct: 0.031, vwapRel: 1.02, volAbnormal: 2.1, atrPct: 0.045, newsCount: 5, list: "DAY_TRADE", rationale: "High buzz, positive sentiment, gap + above VWAP" },
  { ticker: "TSLA", score: 0.61, buzzZ: 1.8, sentiment: 0.10, gapPct: 0.012, vwapRel: 0.998, volAbnormal: 1.4, atrPct: 0.068, newsCount: 2, list: "SWING", rationale: "Sustained buzz, manageable ATR" },
  { ticker: "AAPL", score: 0.58, buzzZ: 1.2, sentiment: 0.20, gapPct: 0.009, vwapRel: 1.00, volAbnormal: 1.1, atrPct: 0.022, newsCount: 1, list: "SWING", rationale: "Balanced profile" },
  { ticker: "PLTR", score: 0.69, buzzZ: 2.1, sentiment: 0.42, gapPct: 0.025, vwapRel: 1.03, volAbnormal: 2.3, atrPct: 0.115, newsCount: 3, list: "DAY_TRADE", rationale: "Buzz + news + volume spike" },
  { ticker: "AMD", score: 0.57, buzzZ: 1.1, sentiment: 0.18, gapPct: 0.006, vwapRel: 1.00, volAbnormal: 0.95, atrPct: 0.036, newsCount: 0, list: "SWING", rationale: "Calmer swing candidate" }
];
