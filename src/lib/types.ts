
export type TickerFeature = {
  ticker: string;
  buzzZ: number;
  sentiment: number;
  price?: number;
  changePercent?: number;
  volume?: number;
  redditSummary?: {
    summary: string;
    postLinks: string[];
  };
};
