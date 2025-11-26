import vader from "vader-sentiment";
import { TickerMention } from "./tickers";
import { MarketData } from "./market";

export function compositeScore(f: { buzzZ:number; sentiment:number; momentum:number; quality:number; }) {
  const buzz = Math.max(0, Math.min(1, f.buzzZ/3));
  const sent = (f.sentiment + 1) / 2;
  const mom  = Math.max(0, Math.min(1, f.momentum));
  const qual = Math.max(0, Math.min(1, f.quality));
  return 0.35*buzz + 0.25*sent + 0.30*mom + 0.10*qual;
}
