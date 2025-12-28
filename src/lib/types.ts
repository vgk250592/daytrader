
export type TickerFeature = {
  ticker: string;
  score: number;
  buzzZ: number;
  sentiment: number;
  gapPct: number;
  vwapRel: number;
  volAbnormal: number;
  atrPct: number;
  newsCount: number;
  list: "DAY_TRADE" | "SWING";
  rationale: string;
  trend5Day?: number; // 5-day price change percentage
  redditSummary?: {
    summary: string;
    bullishPoints: string[];
    bearishPoints: string[];
    keyQuotes: string[];
    overallSentiment: 'bullish' | 'bearish' | 'neutral';
    postLinks: string[];
  };
};
