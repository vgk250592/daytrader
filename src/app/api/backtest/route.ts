
import { NextResponse } from "next/server";
import fs from "fs/promises";
import yahooFinance from "yahoo-finance2";

type Sig = { date: string; ticker: string; list: string; };

export const dynamic = "force-dynamic";

function nextDate(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setDate(dt.getDate()+1);
  return dt.toISOString().slice(0,10);
}

export async function GET() {
  try {
    const raw = await fs.readFile("data/signals.jsonl", "utf-8").catch(()=>"" );
    if (!raw.trim()) return NextResponse.json({ equity: [], trades: [] });
    const lines = raw.trim().split(/\n+/);
    const sigs: Sig[] = lines.map(l => JSON.parse(l));

    const trades:any[] = [];
    for (const s of sigs) {
      const day = nextDate(s.date);
      try {
        const hist = await yahooFinance.historical(s.ticker, { period1: day, period2: day, interval: "1d" });
        if (!hist || !hist.length) continue;
        const bar = hist[0];
        const ret = (bar.close - bar.open) / bar.open;
        trades.push({ date: day, ticker: s.ticker, ret });
      } catch {}
    }

    const byDay: Record<string, number[]> = {};
    for (const t of trades) {
      byDay[t.date] = byDay[t.date] || [];
      byDay[t.date].push(t.ret);
    }
    const dates = Object.keys(byDay).sort();
    let eq = 1;
    const equity = dates.map(d => {
      const avg = byDay[d].reduce((a,b)=>a+b,0)/byDay[d].length;
      eq *= (1+avg);
      return { date: d, equity: eq };
    });

    return NextResponse.json({ equity, trades });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
