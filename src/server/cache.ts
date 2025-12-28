// src/server/cache.ts
// Simple in-memory cache with TTL

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get cached data if it exists and hasn't expired
 */
export function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  const age = now - entry.timestamp;
  
  if (age > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  console.log(`  ✅ Cache hit: ${key} (age: ${Math.floor(age / 1000)}s)`);
  return entry.data;
}

/**
 * Set cached data with TTL in milliseconds
 */
export function setCachedData(key: string, data: any, ttl: number = 15 * 60 * 1000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
  console.log(`  ✅ Cached: ${key} (TTL: ${Math.floor(ttl / 1000)}s)`);
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}
