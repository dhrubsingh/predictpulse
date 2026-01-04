# AI-Powered Smart Search Setup

The Market Explorer now features AI-powered autocomplete using Claude API!

## Features

✨ **Smart Suggestions** - AI understands intent and suggests relevant markets
🔍 **Semantic Search** - Type "crypto" and get Bitcoin, Ethereum suggestions
📊 **Category Grouping** - Organized suggestions by topic
⚡ **Instant Fallback** - Works offline with smart local matching

## Setup Instructions

### 1. Get Your Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-ant-`)

### 2. Configure Environment

1. Create a `.env` file in the `market-explorer` directory:
   ```bash
   cp .env.example .env
   ```

2. Add your API key to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

### 3. Run the Application

**Option A: Run both servers together (recommended)**
```bash
npm run dev:all
```

**Option B: Run servers separately**

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (API Server):
```bash
npm run dev:api
```

### 4. Test the Smart Search

1. Open http://localhost:5173
2. Start typing in the search bar (e.g., "crypto", "election", "weather")
3. Watch AI-powered suggestions appear instantly!

## How It Works

### With API Key (Full AI Mode)
- Claude analyzes your search query
- Understands semantic meaning and context
- Suggests related categories and specific events
- Groups suggestions intelligently

### Without API Key (Fallback Mode)
- Uses local smart keyword matching
- Category detection (crypto, politics, sports, etc.)
- Fuzzy event name matching
- Still fast and useful!

## Cost Considerations

**Claude API Pricing:**
- ~$0.003 per request (very cheap!)
- Each autocomplete query costs about $0.003
- 1000 searches = ~$3
- Most users will spend <$1/month

**Free Alternative:**
- The app works perfectly without an API key
- Falls back to smart local matching
- Zero cost, still intelligent

## Customization

### Adjust Suggestion Count
In `server.js`, modify the prompt to change suggestion count:
```javascript
Task: Generate 3-6 smart search suggestions...
// Change to: Generate 2-4 smart search suggestions...
```

### Change AI Model
In `server.js`, update the model:
```javascript
model: 'claude-3-5-sonnet-20241022',  // Best quality
// or
model: 'claude-3-haiku-20240307',     // Faster, cheaper
```

### Disable AI Completely
Just don't start the API server - the app will use local fallback automatically!

## Troubleshooting

**Suggestions not appearing?**
1. Check if API server is running on port 3001
2. Verify `.env` file has correct API key
3. Check browser console for errors

**API errors?**
1. Verify API key is valid
2. Check you have API credits
3. Ensure no firewall blocking

**Slow suggestions?**
1. Try Claude Haiku model (faster)
2. Reduce number of events sent to API
3. Increase debounce time in App.jsx

## What's Next?

Future AI features you could add:
- **Market analysis**: "Is this market undervalued?"
- **Arbitrage detection**: Find mispriced markets
- **Trend analysis**: "What's trending in crypto markets?"
- **Portfolio suggestions**: "Build me a diversified portfolio"
- **Risk assessment**: "What's the risk/reward here?"

Enjoy your AI-powered market explorer! 🚀
