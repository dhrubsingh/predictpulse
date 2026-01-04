# Predict Pulse Backend

Express.js API server with Python data fetching scripts.

## Structure

```
backend/
├── data/               # Generated JSON data (gitignored)
│   ├── kalshi_events.json
│   ├── polymarket_events.json
│   └── event_embeddings.json
├── scripts/           # Python data fetching
│   ├── get_kalshi.py
│   ├── get_polymarket.py
│   ├── generate_embeddings.py
│   └── update_data.sh
├── api/              # API routes
├── server.js         # Main server file
├── package.json      # Node dependencies
└── requirements.txt  # Python dependencies
```

## Setup

1. **Install dependencies**
```bash
npm install
pip3 install -r requirements.txt
```

2. **Configure environment**
```bash
cp .env.example .env
# Add your API keys to .env
```

3. **Fetch data**
```bash
npm run update-data
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run update-data` - Fetch latest market data

## Data Update Process

The `update_data.sh` script:
1. Fetches Kalshi markets → `data/kalshi_events.json`
2. Fetches Polymarket markets → `data/polymarket_events.json`
3. Generates embeddings → `data/event_embeddings.json`

Run this regularly (every 1-6 hours) to keep data fresh.

## API Documentation

### POST /api/semantic-search

Semantic search for events using embeddings.

**Request:**
```json
{
  "query": "presidential election",
  "topK": 150
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "2024 Presidential Election Winner",
      "platform": "kalshi",
      "event_ticker": "KXPRES-2024"
    }
  ]
}
```

### POST /api/chat

Chat with AI assistant for market recommendations.

**Request:**
```json
{
  "message": "Show me crypto markets",
  "chatHistory": [],
  "rankedEvents": [...],
  "allEventTitles": [...],
  "userPreferences": {...}
}
```

**Response:**
```json
{
  "response": "Here are some crypto markets...",
  "recommendedMarkets": [
    {
      "eventTicker": "BTC-100K",
      "reason": "High liquidity Bitcoin market"
    }
  ]
}
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=     # Claude AI API key
OPENAI_API_KEY=        # OpenAI API key for embeddings
PORT=3001              # Server port (default: 3001)
NODE_ENV=development   # Environment mode
```

## Deployment

### Railway

1. Create new project
2. Connect GitHub repo
3. Set root directory to `/backend`
4. Add environment variables
5. Deploy

### Render

1. Create new Web Service
2. Root Directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add environment variables

## Data Freshness

Market data should be updated regularly. Options:

1. **GitHub Actions**: Automated every 6 hours
2. **Cron Job**: Set up server cron to run `update_data.sh`
3. **Manual**: Run `npm run update-data` as needed

## Cost Estimates

- **Kalshi API**: Free
- **Polymarket API**: Free
- **OpenAI Embeddings**: ~$0.10 per update (10K events)
- **Claude API**: ~$0.01 per chat message

Total: ~$0.50/day for 6-hour updates
