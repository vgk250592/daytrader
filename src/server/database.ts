import Database from 'better-sqlite3';
import path from 'path';
import type { TickerFeature } from '@/lib/types';

const DB_PATH = path.join(process.cwd(), 'data', 'scanner.db');

// Initialize database
let db: Database.Database | null = null;

function getDb() {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  if (!db) return;

  // Create scans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_date TEXT NOT NULL UNIQUE,
      scan_time TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create stocks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      buzz_score REAL NOT NULL,
      sentiment REAL NOT NULL,
      price REAL,
      change_percent REAL,
      volume INTEGER,
      ai_summary TEXT,
      post_links TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scan_id) REFERENCES scans(id),
      UNIQUE(scan_id, ticker)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scan_date ON scans(scan_date);
    CREATE INDEX IF NOT EXISTS idx_stock_scan_id ON stocks(scan_id);
    CREATE INDEX IF NOT EXISTS idx_stock_ticker ON stocks(ticker);
  `);
}

export interface ScanRecord {
  id: number;
  scan_date: string;
  scan_time: string;
  created_at: string;
}

export interface StockRecord {
  id: number;
  scan_id: number;
  ticker: string;
  buzz_score: number;
  sentiment: number;
  price: number | null;
  change_percent: number | null;
  volume: number | null;
  ai_summary: string | null;
  post_links: string | null;
  created_at: string;
}

/**
 * Save a daily scan to the database
 */
export function saveScan(scanDate: string, scanTime: string, tickers: TickerFeature[]): void {
  const database = getDb();
  
  // Start transaction
  const insertScan = database.prepare(`
    INSERT OR REPLACE INTO scans (scan_date, scan_time)
    VALUES (?, ?)
  `);
  
  const insertStock = database.prepare(`
    INSERT OR REPLACE INTO stocks (
      scan_id, ticker, buzz_score, sentiment, price, change_percent, 
      volume, ai_summary, post_links
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = database.transaction(() => {
    // Insert scan record
    const result = insertScan.run(scanDate, scanTime);
    const scanId = result.lastInsertRowid as number;
    
    // Insert all stocks for this scan
    for (const ticker of tickers) {
      const postLinks = ticker.redditSummary?.postLinks 
        ? JSON.stringify(ticker.redditSummary.postLinks) 
        : null;
      
      const aiSummary = ticker.redditSummary?.summary || null;
      
      insertStock.run(
        scanId,
        ticker.ticker,
        ticker.buzzZ,
        ticker.sentiment,
        ticker.price || null,
        ticker.changePercent || null,
        ticker.volume || null,
        aiSummary,
        postLinks
      );
    }
  });
  
  transaction();
}

/**
 * Get scan data for a specific date
 */
export function getScanByDate(scanDate: string): { scan: ScanRecord; stocks: StockRecord[] } | null {
  const database = getDb();
  
  const scan = database.prepare('SELECT * FROM scans WHERE scan_date = ?').get(scanDate) as ScanRecord | undefined;
  
  if (!scan) return null;
  
  const stocks = database.prepare('SELECT * FROM stocks WHERE scan_id = ? ORDER BY buzz_score DESC').all(scan.id) as StockRecord[];
  
  return { scan, stocks };
}

/**
 * Get all scans from the last N days
 */
export function getRecentScans(days: number = 30): Array<{ scan: ScanRecord; stocks: StockRecord[] }> {
  const database = getDb();
  
  const scans = database.prepare(`
    SELECT * FROM scans 
    ORDER BY scan_date DESC 
    LIMIT ?
  `).all(days) as ScanRecord[];
  
  return scans.map(scan => {
    const stocks = database.prepare('SELECT * FROM stocks WHERE scan_id = ? ORDER BY buzz_score DESC').all(scan.id) as StockRecord[];
    return { scan, stocks };
  });
}

/**
 * Convert database records to TickerFeature format
 */
export function stockRecordToTickerFeature(stock: StockRecord): TickerFeature {
  return {
    ticker: stock.ticker,
    buzzZ: stock.buzz_score,
    sentiment: stock.sentiment,
    price: stock.price || undefined,
    changePercent: stock.change_percent || undefined,
    volume: stock.volume || undefined,
    redditSummary: stock.ai_summary ? {
      summary: stock.ai_summary,
      postLinks: stock.post_links ? JSON.parse(stock.post_links) : []
    } : undefined
  };
}

/**
 * Check if a scan exists for a given date
 */
export function scanExists(scanDate: string): boolean {
  const database = getDb();
  const result = database.prepare('SELECT COUNT(*) as count FROM scans WHERE scan_date = ?').get(scanDate) as { count: number };
  return result.count > 0;
}

/**
 * Delete scans older than N days (cleanup)
 */
export function cleanupOldScans(daysToKeep: number = 30): void {
  const database = getDb();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  database.prepare('DELETE FROM scans WHERE scan_date < ?').run(cutoffDateStr);
}
