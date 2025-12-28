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

Provide a comprehensive summary in JSON format:
{
  "summary": "A detailed 3-5 sentence summary capturing the main discussion points, sentiment, key arguments, price targets, catalysts, and any notable risks or opportunities mentioned. Make it unique and specific to this stock's discussion.",
  "overallSentiment": "bullish" | "bearish" | "neutral"
}

Important:
- Make the summary comprehensive and unique to this specific ticker
- Include specific details, numbers, catalysts, or events mentioned
- Capture the WHY behind the sentiment, not just generic statements
- Avoid repetitive or template-like language`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst summarizing Reddit stock discussions. Write comprehensive, unique summaries that capture specific details and context for each stock. Avoid generic or repetitive language.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      ticker,
      summary: result.summary || 'Discussion analysis unavailable.',
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
      summary: `${comments.length} comments discussing ${ticker}. ${sentiment === 'bullish' ? 'Mostly positive sentiment with focus on upside potential.' : sentiment === 'bearish' ? 'Mostly negative sentiment with concerns about downside.' : 'Mixed opinions with no clear consensus.'}`,
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
