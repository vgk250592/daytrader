
"use client";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function Sparkline({ data }: { data: { v: number }[] }) {
  return (
    <div style={{ width: "100%", height: 40 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
