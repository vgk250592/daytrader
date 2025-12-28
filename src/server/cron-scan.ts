// Automated scan job - runs 4x daily
// src/server/cron-scan.ts

import { saveScanResults } from './cache-manager';

/**
 * Run the daily scan and save results to cache
 * This function is called by the cron job
 */
export async function runAutomatedScan(scanTime: string): Promise<void> {
  console.log(`\n🤖 Starting automated scan: ${scanTime}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

  try {
    // Import the scan logic from route
    const { runDailyScan } = await import('./scan-logic');
    
    // Run the scan
    const results = await runDailyScan();
    
    // Save to cache
    await saveScanResults(results, scanTime);
    
    console.log(`\n✅ Automated scan complete: ${results.length} tickers cached`);
  } catch (error) {
    console.error(`\n❌ Automated scan failed:`, error);
  }
}

/**
 * Determine which scan time to run based on current hour (EST)
 */
export function getCurrentScanTime(): string {
  const now = new Date();
  const hour = now.getHours(); // UTC hour
  
  // Convert to EST (UTC-5)
  const estHour = (hour - 5 + 24) % 24;
  
  if (estHour >= 9 && estHour < 12) {
    return 'market_open'; // 9:30 AM EST
  } else if (estHour >= 12 && estHour < 15) {
    return 'midday'; // 12:00 PM EST
  } else if (estHour >= 15 && estHour < 18) {
    return 'market_close'; // 4:00 PM EST
  } else {
    return 'after_hours'; // 8:00 PM EST
  }
}

// If run directly (for testing or manual trigger)
if (require.main === module) {
  const scanTime = process.argv[2] || getCurrentScanTime();
  runAutomatedScan(scanTime).then(() => {
    console.log('Done!');
    process.exit(0);
  }).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
