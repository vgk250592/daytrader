// src/server/tickers.ts
import { extractTickers } from "./reddit";

export interface TickerMention {
  ticker: string;
  count: number;
  totalScore: number;
  totalComments: number;
  posts: Array<{
    title: string;
    score: number;
    comments: number;
    text: string;
  }>;
}

export interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
}

export function aggregateTickerMentions(posts: RedditPost[]): TickerMention[] {
  const tickerMap = new Map<string, TickerMention>();

  for (const post of posts) {
    const text = `${post.title} ${post.selftext}`;
    const tickers = extractTickers(text);

    for (const ticker of tickers) {
      if (!tickerMap.has(ticker)) {
        tickerMap.set(ticker, {
          ticker,
          count: 0,
          totalScore: 0,
          totalComments: 0,
          posts: [],
        });
      }

      const mention = tickerMap.get(ticker)!;
      mention.count++;
      mention.totalScore += post.score;
      mention.totalComments += post.num_comments;
      mention.posts.push({
        title: post.title,
        score: post.score,
        comments: post.num_comments,
        text: text.substring(0, 500),
      });
    }
  }

  return Array.from(tickerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}