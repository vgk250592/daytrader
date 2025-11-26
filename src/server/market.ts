// src/server/market.ts
// IMPROVED VERSION with better error handling and logging

import yahooFinance from "yahoo-finance2";

export async function getMarketFeatures(tickers: string[]) {
  const out: Record<string, any> = {};
  let successCount = 0;
  let failCount = 0;
  
  console.log(`  Fetching data for ${tickers.length} tickers...`);
  
  for (const t of tickers) {
    try {
      // Add a small delay to avoid rate limiting (50ms between requests)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const quote = await yahooFinance.quote(t);
      
      if (!quote || !quote.regularMarketPrice) {
        console.log(`  ⚠️  ${t}: No quote data`);
        failCount++;
        continue;
      }
      
      const hist = await yahooFinance.historical(t, { 
        period1: "30d", 
        interval: "1d" 
      });
      
      let atr = 0;
      if (hist && hist.length >= 5) {
        const trs: number[] = [];
        for (let i=1; i<hist.length; i++) {
          const h = hist[i].high, l = hist[i].low, pc = hist[i-1].close;
          const tr = Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc));
          trs.push(tr);
        }
        const atrVal = trs.slice(-20).reduce((a,b)=>a+b,0) / Math.min(20, trs.length);
        atr = atrVal / (quote.regularMarketPrice || 1);
      }
      
      const avgVol = (quote.averageDailyVolume3Month || 0);
      const price = quote.regularMarketPrice || 0;
      const dollarVol = avgVol * price;
      
      out[t] = { price, atrPct: atr, avgDollarVol: dollarVol };
      successCount++;
      
      if (successCount % 5 === 0) {
        console.log(`  Progress: ${successCount}/${tickers.length} fetched`);
      }
      
    } catch (error: any) {
      console.log(`  ❌ ${t}: ${error.message || 'Failed'}`);
      failCount++;
    }
  }
  
  console.log(`  ✓ Market data: ${successCount} success, ${failCount} failed`);
  
  return out;
}
