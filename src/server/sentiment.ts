// src/server/sentiment.ts
// Sentiment analysis for ticker mentions

import vader from 'vader-sentiment';

interface Post {
  title: string;
  selftext: string;
}

/**
 * Analyze sentiment for posts mentioning a specific ticker
 */
export function analyzeTickerSentiment(posts: Post[]): number {
  if (posts.length === 0) {
    return 0;
  }

  const allText = posts
    .map(p => `${p.title} ${p.selftext}`)
    .join(' ');

  const sentimentScore = vader.SentimentIntensityAnalyzer.polarity_scores(allText);
  
  // Return compound score (-1 to 1)
  return sentimentScore.compound;
}

/**
 * Analyze sentiment for a single text
 */
export function analyzeSentiment(text: string): number {
  const sentimentScore = vader.SentimentIntensityAnalyzer.polarity_scores(text);
  return sentimentScore.compound;
}
