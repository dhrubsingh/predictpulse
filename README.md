# Predict Pulse

AI-powered prediction market explorer for Kalshi and Polymarket. Search, analyze, and get personalized recommendations for prediction markets using semantic search and Claude AI.

## Features

- 🔍 **Semantic Search** - Find markets using natural language queries
- 🤖 **AI Assistant** - Get personalized market recommendations from Claude
- 📊 **Quality Metrics** - Markets ranked by liquidity, volume, and spread
- 🌐 **Multi-Platform** - Browse both Kalshi and Polymarket in one place
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## Project Structure

```
predict-pulse/
├── backend/              # Backend API server
│   ├── data/            # Generated market data (gitignored)
│   ├── scripts/         # Python data fetching scripts
│   ├── server.js        # Express API server
│   └── package.json     # Backend dependencies
├── src/                 # Frontend React application
├── public/              # Static assets
└── .github/workflows/   # Automated data updates
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- OpenAI API key
- Anthropic API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/predict-pulse.git
cd predict-pulse
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
npm install
pip3 install -r requirements.txt
```

4. **Set up environment variables**
```bash
# In backend/ directory
cp .env.example .env
# Edit .env and add your API keys
```

5. **Fetch initial data**
```bash
cd backend
npm run update-data
```

6. **Copy data to frontend**
```bash
cp backend/data/*.json public/
```

### Development

Run frontend and backend concurrently:

```bash
# Terminal 1: Frontend (from root)
npm run dev

# Terminal 2: Backend (from backend/)
cd backend
npm run dev
```

Visit `http://localhost:5173` for the frontend.

## Data Updates

### Manual Update

```bash
cd backend
npm run update-data
```

### Automated Updates

The project includes a GitHub Actions workflow that automatically updates market data every 6 hours. To enable:

1. Add `OPENAI_API_KEY` to your GitHub repository secrets
2. The workflow will automatically commit updates to the `backend/data/` directory

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

### Backend (Railway/Render)

1. Create new service pointing to `/backend` directory
2. Add environment variables (API keys)
3. Set build command: `npm install`
4. Set start command: `npm start`

## API Endpoints

- `POST /api/semantic-search` - Semantic search for markets
- `POST /api/suggestions` - AI-powered search suggestions  
- `POST /api/chat` - Chat with AI assistant

## Technologies

**Frontend:**
- React 19
- Vite
- Fuse.js (fuzzy search)
- ReactMarkdown
- Lucide React (icons)

**Backend:**
- Express.js
- Anthropic Claude API
- OpenAI Embeddings API
- Python (data fetching)

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT
