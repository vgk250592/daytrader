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

interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
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

    return response.data.data.children.map((child: any) => child.data);
  } catch (error: any) {
    console.error("Reddit fetch error:", error.response?.data || error.message);
    throw new Error(`Failed to fetch Reddit posts: ${error.message}`);
  }
}

// Extract stock tickers from text (simple regex approach)
// Extract stock tickers from text (simple regex approach)
export function extractTickers(text: string): string[] {
  const tickerRegex = /\b[A-Z]{1,5}\b/g;
  const matches = text.match(tickerRegex) || [];
  
  // Filter out common words that aren't tickers
  const commonWords = new Set([
    "A", "I", "DD", "YOLO", "WSB", "IMO", "CEO", "USD", "USA", "NYC",
    "ATH", "IPO", "ETF", "PM", "AM", "RE", "IT", "AI", "PR", "HR"
  ]);
  
  return [...new Set(matches.filter(ticker => !commonWords.has(ticker)))];
}