
"use client";
import { useEffect, useState } from "react";

type Point = { date: string; equity: number };

export default function BacktestPage() {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    fetch("/api/backtest").then(r=>r.json()).then(j=> setData(j.equity||[]));
  }, []);

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Backtest (rolling)</h1>
      <p className="text-sm text-slate-400">Builds an equity curve from your saved daily signals (open→close, equal-weight). Starts empty until you run signals on different days.</p>
      <div className="card p-5">
        {data.length === 0 ? <div>No data yet. Run daily signals a few days, then come back.</div> :
          <ul className="list-disc pl-6">
            {data.map(p => <li key={p.date}>{p.date}: {p.equity.toFixed(3)}x</li>)}
          </ul>
        }
      </div>
    </div>
  );
}
