// API endpoint for AI-powered search suggestions using Claude
// This is a Vite/Express compatible API route

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, events } = req.body;

  if (!query || !events) {
    return res.status(400).json({ error: 'Missing query or events' });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY,
    });

    // Create a concise prompt for Claude
    const prompt = `You are helping users discover prediction markets on Kalshi. Given a search query, suggest relevant search terms and categories.

User's search query: "${query}"

Available market categories and examples:
${events.slice(0, 30).map(e => `- ${e.title}`).join('\n')}

Task: Generate 3-6 smart search suggestions that will help the user find relevant markets. Consider:
1. Semantic understanding (e.g., "crypto" should suggest Bitcoin, Ethereum)
2. Related topics and synonyms
3. Popular market categories
4. Trending events

Return ONLY a JSON array of suggestions in this format:
[
  {"type": "category", "text": "Crypto markets", "query": "Bitcoin"},
  {"type": "event", "text": "Bitcoin price predictions", "query": "Bitcoin"}
]

Types: "category" for broad topics, "event" for specific markets.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract JSON from Claude's response
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ suggestions });
    } else {
      // Fallback if Claude doesn't return valid JSON
      return res.status(200).json({
        suggestions: [
          { type: 'event', text: `Search for "${query}"`, query: query }
        ]
      });
    }

  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({
      error: 'AI suggestion failed',
      suggestions: [
        { type: 'event', text: `Search for "${query}"`, query: query }
      ]
    });
  }
}
