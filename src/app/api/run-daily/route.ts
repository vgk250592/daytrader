// src/app/api/run-daily/route.ts
// ✅ UPDATED VERSION - Uses cached results for instant loading

import { NextResponse } from "next/server";
import { loadScanResults, isCacheFresh } from "@/server/cache-manager";
import { runDailyScan } from "@/server/scan-logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  console.log("\n🚀 API call: run-daily");
  
  try {
    // Try to load cached results first
    const cached = await loadScanResults();
    
    if (cached && isCacheFresh(cached)) {
      console.log(`✅ Returning cached results from ${cached.scanTime} (${cached.data.length} tickers)`);
      return NextResponse.json({ 
        rows: cached.data,
        cached: true,
        timestamp: cached.timestamp,
        scanTime: cached.scanTime
      });
    }

    // No cache or stale cache - run fresh scan
    console.log("⚠️  No fresh cache available, running fresh scan...");
    const rows = await runDailyScan();
    
    console.log(`✅ Returning ${rows.length} fresh tickers`);
    
    return NextResponse.json({ 
      rows,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (e: any) {
    const status = e?.response?.status;
    const payload = e?.response?.data ?? e?.message ?? String(e);
    console.error("❌ run-daily error:", status ?? "no-status", payload);
    console.error("Full error:", e);

    return NextResponse.json(
      { error: payload },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET() {
  return POST();
}
