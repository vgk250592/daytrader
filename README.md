
# Reddit Stock Scanner (MVP)

A minimal Next.js + TypeScript + Tailwind app that surfaces day-trade and swing ideas from Reddit buzz + sentiment + market confirms. This starter ships a UI, a stub API, and dummy data so you can click around. Wire real data next.

## Quick start
```bash
pnpm i   # or npm i / yarn
pnpm dev # http://localhost:3000
```
(If you don't have pnpm, use `npm` or `yarn`.)

## What to wire next
- **Reddit ingestion:** PRAW or Reddit REST + OAuth. Ingest posts & top comments from subreddits (stocks, investing, wallstreetbets, options...). Store raw + parsed ticker hits.
- **Ticker universe:** Russell 3000 + ADR whitelist. Avoid false positives like `A`, `IT`, `ALL`.
- **Sentiment:** VADER (fast) + FinBERT (optional). Weighted by upvotes, subreddit weight, author karma.
- **Market data:** price, premarket gap, VWAP, ATR(20), avg dollar volume, news count, earnings date. (Polygon/Alpaca/IBKR/Yahoo mix).
- **Scoring & rules:** Implement the composite score and the DAY_TRADE / SWING filters from the product note.
- **Cron:** Hit `/api/run-daily` from a scheduler at 07:30 ET, 09:35 ET, and 15:55 ET.

## Folder layout
- `src/app` — App Router pages and API route (`/api/run-daily` stub)
- `src/components` — UI building blocks
- `src/lib` — types, scoring helpers, dummy data

## Tailwind
Already configured. Styles live in `src/app/globals.css`.

## Disclaimer
This is an experimental research tool and **not financial advice**. Paper-trade first.
