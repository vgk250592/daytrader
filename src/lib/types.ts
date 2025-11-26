
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
};
