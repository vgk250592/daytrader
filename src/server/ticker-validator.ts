// ✅ CORRECTED VERSION - Addresses ChatGPT Issue #4
// src/server/ticker-validator.ts

import validTickersData from '@/data/valid-tickers.json';

// Convert array to Set for O(1) lookup
const validTickers = new Set(validTickersData);

// Expanded blacklist of common words that look like tickers
const BLACKLIST = new Set([
  // Common words
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
  'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW',
  'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID',
  'ILL', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'WAY', 'WHY', 'WIN',
  
  // Abbreviations/acronyms
  'TLDR', 'TL;DR', 'IMO', 'IMHO', 'FYI', 'BTW', 'ETA', 'AMA', 'TIL',
  'PSA', 'NSFW', 'SFW', 'OC', 'OP', 'TBH', 'SMH', 'FOMO', 'YOLO',
  
  // Financial terms
  'EPS', 'PE', 'PEG', 'ROE', 'ROI', 'YTD', 'QOQ', 'YOY', 'ATH', 'ATL',
  'DD', 'TA', 'FA', 'IPO', 'SPAC', 'ETF', 'CEO', 'CFO', 'CTO',
  
  // Reddit-specific
  'WSB', 'DD', 'YOLO', 'GUH', 'MOON', 'HODL', 'FUD', 'FOMO', 'BTFD',
  
  // Single letters (too ambiguous)
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  
  // Two letters (mostly ambiguous)
  'AM', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN',
  'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP',
  'US', 'WE',
  
  // Common Reddit words
  'THIS', 'THAT', 'WHAT', 'WHEN', 'WHERE', 'WHICH', 'WHILE', 'WITH',
  'WOULD', 'COULD', 'SHOULD', 'MIGHT', 'MUST', 'NEED', 'WANT',
]);

/**
 * ✅ FIX #4: Smarter validation logic
 * 
 * OLD BEHAVIOR (too strict):
 * - Blacklist → REJECT
 * - Not in database → REJECT
 * - Result: Misses new IPOs, SPACs, OTC stocks
 * 
 * NEW BEHAVIOR (smart pre-filter):
 * - Blacklist → REJECT (strict)
 * - Not in database → WARN but ALLOW (let API decide)
 * - Result: Catches legitimate tickers, reduces API calls for obvious fakes
 */
export function isValidTicker(ticker: string): boolean {
  // 1. Strict blacklist check
  if (BLACKLIST.has(ticker)) {
    console.log(`  ❌ ${ticker}: Blacklisted word`);
    return false;
  }

  // 2. Basic format validation
  if (ticker.length < 1 || ticker.length > 5) {
    console.log(`  ❌ ${ticker}: Invalid length (${ticker.length})`);
    return false;
  }

  // 3. Must be all uppercase letters
  if (!/^[A-Z]+$/.test(ticker)) {
    console.log(`  ❌ ${ticker}: Contains non-letter characters`);
    return false;
  }

  // 4. Database check (soft - just a hint, not a blocker)
  const inDatabase = validTickers.has(ticker);
  
  if (!inDatabase) {
    // ✅ FIX #4: Warn but don't reject
    console.log(`  ⚠️  ${ticker}: Not in NASDAQ database (might be new/OTC/SPAC)`);
    // Still return true - let the API be the final judge
  }

  return true;
}

/**
 * Filters a list of tickers, removing blacklisted and invalid ones
 * Returns both valid tickers and warnings for non-database tickers
 */
export function filterTickers(tickers: string[]): {
  valid: string[];
  warnings: string[];
} {
  const valid: string[] = [];
  const warnings: string[] = [];

  for (const ticker of tickers) {
    if (isValidTicker(ticker)) {
      valid.push(ticker);
      
      // Track warnings for tickers not in database
      if (!validTickers.has(ticker)) {
        warnings.push(ticker);
      }
    }
  }

  return { valid, warnings };
}

/**
 * Get stats about the ticker database
 */
export function getValidatorStats() {
  return {
    totalTickers: validTickers.size,
    blacklistedWords: BLACKLIST.size,
  };
}
