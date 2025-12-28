// Cron job runner - runs automated scans 4x daily
// Run with: node cron-runner.js

const { spawn } = require('child_process');
const cron = require('node-cron');

console.log('🤖 Reddit Stock Scanner - Automated Cron Runner');
console.log('📅 Schedule: 4 scans per day');
console.log('   - 9:30 AM EST: Market Open');
console.log('   - 12:00 PM EST: Midday');
console.log('   - 4:00 PM EST: Market Close');
console.log('   - 8:00 PM EST: After Hours\n');

function runScan(scanTime) {
  console.log(`\n⏰ [${new Date().toLocaleString()}] Triggering ${scanTime} scan...`);
  
  const child = spawn('npx', ['tsx', 'src/server/cron-scan.ts', scanTime], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`✅ ${scanTime} scan completed successfully\n`);
    } else {
      console.error(`❌ ${scanTime} scan failed with code ${code}\n`);
    }
  });
}

// Schedule scans (times in EST = UTC-5)
// Market Open: 9:30 AM EST = 2:30 PM UTC
cron.schedule('30 14 * * 1-5', () => {
  runScan('market_open');
}, {
  timezone: 'America/New_York'
});

// Midday: 12:00 PM EST = 5:00 PM UTC
cron.schedule('0 17 * * 1-5', () => {
  runScan('midday');
}, {
  timezone: 'America/New_York'
});

// Market Close: 4:00 PM EST = 9:00 PM UTC
cron.schedule('0 21 * * 1-5', () => {
  runScan('market_close');
}, {
  timezone: 'America/New_York'
});

// After Hours: 8:00 PM EST = 1:00 AM UTC (next day)
cron.schedule('0 1 * * 2-6', () => {
  runScan('after_hours');
}, {
  timezone: 'America/New_York'
});

console.log('✅ Cron jobs scheduled. Press Ctrl+C to stop.\n');

// Run once immediately on startup for testing
console.log('🧪 Running initial scan for testing...');
runScan('startup_test');
