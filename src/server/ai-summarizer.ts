// AI-powered Reddit discussion summarizer
// src/server/ai-summarizer.ts

import OpenAI from 'openai';
import type { RedditComment } from './reddit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TickerSummary {
  ticker: string;
  summary: string;
  bullishPoints: string[];
  bearishPoints: string[];
  keyQuotes: string[];
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Summarize Reddit discussion for a ticker using AI
 */
export async function summarizeTickerDiscussion(
  ticker: string,
  postTitles: string[],
  comments: RedditComment[]
): Promise<TickerSummary> {
  if (comments.length === 0 && postTitles.length === 0) {
    return {
      ticker,
      summary: 'No significant discussion found on Reddit.',
      bullishPoints: [],
      bearishPoints: [],
      keyQuotes: [],
      overallSentiment: 'neutral',
    };
  }

  try {
    // Prepare context for AI
    const postsContext = postTitles.length > 0 
      ? `Post titles:\n${postTitles.map(t => `- ${t}`).join('\n')}\n\n`
      : '';
    
    const commentsContext = comments.length > 0
      ? `Top comments:\n${comments.map((c, i) => `${i + 1}. (${c.score} upvotes) ${c.body.slice(0, 300)}`).join('\n\n')}`
      : '';

    const prompt = `Analyze this Reddit discussion about stock ticker ${ticker} from r/wallstreetbets:

${postsContext}${commentsContext}

Provide a concise summary in JSON format:
{
  "summary": "2-3 sentence overview of what people are saying",
  "bullishPoints": ["key bullish argument 1", "key bullish argument 2"],
  "bearishPoints": ["key bearish argument 1", "key bearish argument 2"],
  "keyQuotes": ["memorable quote 1", "memorable quote 2"],
  "overallSentiment": "bullish" | "bearish" | "neutral"
}

Focus on:
- Main reasons people are buying/selling
- Price targets or catalysts mentioned
- Risks or concerns
- Keep it concise and actionable`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst summarizing Reddit stock discussions. Be concise, objective, and focus on key trading insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      ticker,
      summary: result.summary || 'Discussion analysis unavailable.',
      bullishPoints: result.bullishPoints || [],
      bearishPoints: result.bearishPoints || [],
      keyQuotes: result.keyQuotes || [],
      overallSentiment: result.overallSentiment || 'neutral',
    };
  } catch (error) {
    console.error(`Error summarizing ${ticker}:`, error);
    
    // Fallback: Simple sentiment analysis
    const allText = comments.map(c => c.body.toLowerCase()).join(' ');
    const bullishWords = ['buy', 'calls', 'moon', 'bullish', 'long', 'up'];
    const bearishWords = ['sell', 'puts', 'bearish', 'short', 'down', 'crash'];
    
    const bullishCount = bullishWords.reduce((sum, word) => 
      sum + (allText.match(new RegExp(word, 'g')) || []).length, 0
    );
    const bearishCount = bearishWords.reduce((sum, word) => 
      sum + (allText.match(new RegExp(word, 'g')) || []).length, 0
    );
    
    const sentiment = bullishCount > bearishCount * 1.5 ? 'bullish' :
                      bearishCount > bullishCount * 1.5 ? 'bearish' : 'neutral';

    return {
      ticker,
      summary: `${comments.length} comments discussing ${ticker}. ${sentiment === 'bullish' ? 'Mostly positive sentiment.' : sentiment === 'bearish' ? 'Mostly negative sentiment.' : 'Mixed opinions.'}`,
      bullishPoints: [],
      bearishPoints: [],
      keyQuotes: comments.slice(0, 2).map(c => c.body.slice(0, 150) + '...'),
      overallSentiment: sentiment,
    };
  }
}

/**
 * Batch summarize multiple tickers
 */
export async function batchSummarizeDiscussions(
  tickerData: Array<{
    ticker: string;
    postTitles: string[];
    comments: RedditComment[];
  }>
): Promise<Map<string, TickerSummary>> {
  const summaries = new Map<string, TickerSummary>();

  // Process in batches of 3 to avoid rate limits
  for (let i = 0; i < tickerData.length; i += 3) {
    const batch = tickerData.slice(i, i + 3);
    
    const batchPromises = batch.map(data =>
      summarizeTickerDiscussion(data.ticker, data.postTitles, data.comments)
    );

    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(summary => {
      summaries.set(summary.ticker, summary);
    });

    // Small delay between batches
    if (i + 3 < tickerData.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return summaries;
}
