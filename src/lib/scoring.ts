
import type { TickerFeature } from "./types";

export const compositeScore = (f: {
  buzzZ: number; sentiment: number; momentum: number; quality: number;
}) => {
  const buzz = Math.min(Math.max(f.buzzZ/3, 0), 1);
  const sent = (f.sentiment + 1) / 2;
  const momentum = Math.min(Math.max(f.momentum, 0), 1);
  const quality = Math.min(Math.max(f.quality, 0), 1);
  return 0.35*buzz + 0.25*sent + 0.30*momentum + 0.10*quality;
};

export function decideList(x: TickerFeature): TickerFeature["list"] {
  if (x.volAbnormal > 1.5 && (x.gapPct > 0.02 || x.newsCount >= 3) && x.score >= 0.65) return "DAY_TRADE";
  if (x.score >= 0.55 && x.atrPct < 0.12) return "SWING";
  return x.score >= 0.65 ? "DAY_TRADE" : "SWING";
}
