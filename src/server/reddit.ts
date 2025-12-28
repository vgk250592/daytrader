// src/server/reddit.ts
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Inline environment loader - no separate file needed
function redditEnv() {
  const id = process.env.REDDIT_CLIENT_ID?.trim();
  const secret = (process.env.REDDIT_CLIENT_SECRET ?? "").trim();
  const refresh = process.env.REDDIT_REFRESH_TOKEN?.trim();

  const missing: string[] = [];
  if (!id) missing.push("REDDIT_CLIENT_ID");
  if (!refresh) missing.push("REDDIT_REFRESH_TOKEN");

  if (missing.length) {
    throw new Error(
      `Missing env: ${missing.join(", ")}. Check .env and restart npm run dev.`
    );
  }
  return { id, secret, refresh };
}

export interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  id: string;
}

export interface RedditComment {
  body: string;
  score: number;
  author: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid
  if (cachedAccessToken && now < tokenExpiry) {
    return cachedAccessToken;
  }

  const { id, secret, refresh } = redditEnv();

  try {
    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "DayTrader/1.0",
        },
      }
    );

    cachedAccessToken = response.data.access_token;
    // Refresh 5 minutes before expiry
    tokenExpiry = now + (response.data.expires_in - 300) * 1000;
    
    return cachedAccessToken;
  } catch (error: any) {
    console.error("Reddit token error:", error.response?.data || error.message);
    throw new Error(`Failed to get Reddit access token: ${error.message}`);
  }
}

export async function fetchRedditPosts(
  subreddit: string = "wallstreetbets",
  limit: number = 100
): Promise<RedditPost[]> {
  try {
    const token = await getAccessToken();

    const response = await axios.get(
      `https://oauth.reddit.com/r/${subreddit}/hot`,
      {
        params: { limit },
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "DayTrader/1.0",
        },
      }
    );

    return response.data.data.children.map((child: any) => ({
      ...child.data,
      permalink: child.data.permalink,
      id: child.data.id,
    }));
  } catch (error: any) {
    console.error("Reddit fetch error:", error.response?.data || error.message);
    throw new Error(`Failed to fetch Reddit posts: ${error.message}`);
  }
}

/**
 * Fetch comments from a Reddit post
 */
export async function fetchPostComments(
  postId: string,
  limit: number = 50
): Promise<RedditComment[]> {
  try {
    const token = await getAccessToken();

    const response = await axios.get(
      `https://oauth.reddit.com/comments/${postId}`,
      {
        params: { limit, depth: 1, sort: 'top' },
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "DayTrader/1.0",
        },
      }
    );

    // Reddit returns [post, comments] array
    const commentsData = response.data[1]?.data?.children || [];
    
    return commentsData
      .filter((child: any) => child.kind === 't1') // Only comments
      .map((child: any) => ({
        body: child.data.body,
        score: child.data.score,
        author: child.data.author,
      }))
      .filter((comment: RedditComment) => 
        comment.body && 
        comment.body.length > 20 && 
        !comment.body.includes('[deleted]') &&
        !comment.body.includes('[removed]')
      );
  } catch (error: any) {
    console.error(`Error fetching comments for post ${postId}:`, error.message);
    return []; // Return empty array on error
  }
}

/**
 * Get Reddit discussion summary for a specific ticker
 */
export async function getTickerDiscussion(
  ticker: string,
  posts: RedditPost[]
): Promise<{
  mentions: number;
  posts: Array<{ title: string; score: number; comments: number; permalink: string }>;
  topComments: RedditComment[];
}> {
  // Find posts mentioning this ticker
  const relevantPosts = posts.filter(post => {
    const text = `${post.title} ${post.selftext}`.toUpperCase();
    return text.includes(ticker.toUpperCase());
  });

  if (relevantPosts.length === 0) {
    return { mentions: 0, posts: [], topComments: [] };
  }

  // Get top 3 most upvoted posts
  const topPosts = relevantPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(post => ({
      title: post.title,
      score: post.score,
      comments: post.num_comments,
      permalink: `https://reddit.com${post.permalink}`,
    }));

  // Fetch comments from the most popular post
  const mostPopularPost = relevantPosts[0];
  let topComments: RedditComment[] = [];
  
  try {
    const comments = await fetchPostComments(mostPopularPost.id, 20);
    topComments = comments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 comments
  } catch (error) {
    console.error(`Failed to fetch comments for ${ticker}:`, error);
  }

  return {
    mentions: relevantPosts.length,
    posts: topPosts,
    topComments,
  };
}

// Extract stock tickers from text (simple regex approach)
export function extractTickers(text: string): string[] {
  const tickerRegex = /\b[A-Z]{1,5}\b/g;
  const matches = text.match(tickerRegex) || [];
  
  // Filter out common words that aren't tickers
  const commonWords = new Set([
    "A", "I", "DD", "YOLO", "WSB", "IMO", "CEO", "USD", "USA", "NYC",
    "ATH", "IPO", "ETF", "PM", "AM", "RE", "IT", "AI", "PR", "HR", "TLDR",
    "TL", "DR", "EPS", "PE", "ROI", "YTD", "QOQ", "MOM", "FUD", "FOMO"
  ]);
  
  return [...new Set(matches.filter(ticker => !commonWords.has(ticker)))];
}
