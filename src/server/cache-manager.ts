// Cache manager for storing and retrieving scan results
// src/server/cache-manager.ts

import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'src/data/latest-scan.json');

export interface CachedScanResult {
  timestamp: string;
  scanTime: string; // "market_open", "midday", "market_close", "after_hours"
  data: any[];
}

/**
 * Save scan results to cache file
 */
export async function saveScanResults(data: any[], scanTime: string): Promise<void> {
  const cacheData: CachedScanResult = {
    timestamp: new Date().toISOString(),
    scanTime,
    data,
  };

  try {
    // Ensure directory exists
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
    console.log(`✅ Cached scan results: ${data.length} tickers at ${scanTime}`);
  } catch (error) {
    console.error('❌ Failed to save cache:', error);
  }
}

/**
 * Load scan results from cache file
 */
export async function loadScanResults(): Promise<CachedScanResult | null> {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      console.log('⚠️  No cached results found');
      return null;
    }

    const content = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cacheData: CachedScanResult = JSON.parse(content);
    
    console.log(`✅ Loaded cached results: ${cacheData.data.length} tickers from ${cacheData.scanTime}`);
    return cacheData;
  } catch (error) {
    console.error('❌ Failed to load cache:', error);
    return null;
  }
}

/**
 * Check if cache is fresh (less than 6 hours old)
 */
export function isCacheFresh(cache: CachedScanResult | null): boolean {
  if (!cache) return false;
  
  const cacheAge = Date.now() - new Date(cache.timestamp).getTime();
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  return cacheAge < SIX_HOURS;
}
