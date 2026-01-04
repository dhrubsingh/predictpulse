# Project Structure

## Directory Layout

```
predict-pulse/
│
├── frontend (root)
│   ├── src/                    # React source code
│   │   ├── App.jsx            # Main React component
│   │   ├── App.css            # Styles
│   │   └── main.jsx           # Entry point
│   ├── public/                # Static assets
│   │   └── *.json            # Data files (copied from backend)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── data/                  # Generated data files (gitignored)
│   │   ├── kalshi_events.json
│   │   ├── polymarket_events.json
│   │   └── event_embeddings.json
│   │
│   ├── scripts/               # Python data fetching
│   │   ├── get_kalshi.py            # Fetch Kalshi markets
│   │   ├── get_polymarket.py        # Fetch Polymarket markets
│   │   ├── generate_embeddings.py   # Create search embeddings
│   │   └── update_data.sh           # Run all updates
│   │
│   ├── api/                   # API route handlers
│   │   └── suggestions.js
│   │
│   ├── server.js              # Express server
│   ├── package.json           # Backend Node dependencies
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment template
│   └── README.md             # Backend documentation
│
├── .github/
│   └── workflows/
│       └── update-data.yml    # Auto-update market data
│
├── .gitignore                 # Git ignore patterns
├── README.md                  # Main documentation
├── DEPLOYMENT.md             # Deployment guide
└── PROJECT_STRUCTURE.md      # This file
```

## Data Flow

```
┌─────────────────┐
│  Python Scripts │
│  (every 6 hours)│
└────────┬────────┘
         │
         ├──► Fetch Kalshi API
         ├──► Fetch Polymarket API
         ├──► Generate Embeddings (OpenAI)
         │
         ▼
┌─────────────────┐
│  backend/data/  │
│  *.json files   │
└────────┬────────┘
         │
         ├──► Copy to public/ (dev)
         ├──► Loaded by server.js
         │
         ▼
┌─────────────────┐
│  Express Server │
│  API Endpoints  │
└────────┬────────┘
         │
         ├──► /api/semantic-search
         ├──► /api/chat (Claude)
         ├──► /api/suggestions
         │
         ▼
┌─────────────────┐
│  React Frontend │
│  User Interface │
└─────────────────┘
```

## Development Workflow

### 1. Initial Setup
```bash
# Clone repo
git clone <your-repo>
cd predict-pulse

# Install all dependencies
npm run setup

# Set up environment
cd backend
cp .env.example .env
# Edit .env with your API keys
```

### 2. Fetch Data
```bash
# From root directory
npm run update-data

# Copy to frontend
npm run copy-data
```

### 3. Development
```bash
# Run both frontend and backend
npm run dev:all

# Or run separately:
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend  
npm run dev:backend
```

### 4. Update Data
```bash
# Manual update
npm run update-data
npm run copy-data

# Automated (GitHub Actions)
# Runs every 6 hours automatically
```

## File Purposes

### Frontend Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main React component with all UI logic |
| `src/App.css` | All styling (no CSS modules) |
| `public/*.json` | Market data files (copied from backend) |
| `vite.config.js` | Vite bundler configuration |

### Backend Files

| File | Purpose |
|------|---------|
| `server.js` | Express API server, handles all endpoints |
| `scripts/get_kalshi.py` | Fetches Kalshi market data |
| `scripts/get_polymarket.py` | Fetches Polymarket market data |
| `scripts/generate_embeddings.py` | Creates OpenAI embeddings for search |
| `scripts/update_data.sh` | Runs all 3 Python scripts in sequence |
| `data/*.json` | Generated market data (not in git) |

### Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (not in git) |
| `.env.example` | Template for environment variables |
| `.gitignore` | Files to exclude from git |
| `package.json` | Node.js dependencies and scripts |
| `requirements.txt` | Python dependencies |

## Git Workflow

### What's Tracked in Git

✅ Source code (`src/`, `backend/`)
✅ Configuration files (`.env.example`, `*.config.js`)
✅ Documentation (`.md` files)
✅ GitHub Actions workflows

### What's Ignored

❌ `node_modules/`
❌ `.env` files
❌ `backend/data/*.json` (generated data)
❌ `public/*.json` (copied data)
❌ `dist/` (build output)

### Updating Data Files

Data files are regenerated frequently and should NOT be committed:
- Use GitHub Actions for automated updates
- Or run `npm run update-data` locally
- Copy to public folder for local dev: `npm run copy-data`

## Environment Variables

### Backend (.env)

```bash
ANTHROPIC_API_KEY=      # Claude AI (chat feature)
OPENAI_API_KEY=         # OpenAI (embeddings for search)
PORT=3001               # Server port
NODE_ENV=development    # Environment mode
```

### Frontend

Frontend uses Vite environment variables:
```bash
VITE_API_URL=           # Backend API URL (production only)
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/semantic-search` | POST | Find markets by natural language query |
| `/api/suggestions` | POST | Get AI suggestions for queries |
| `/api/chat` | POST | Chat with Claude for recommendations |

## Scripts Reference

### Root Package.json

```bash
npm run dev             # Start frontend dev server
npm run dev:backend     # Start backend dev server  
npm run dev:all         # Start both concurrently
npm run build           # Build frontend for production
npm run update-data     # Fetch latest market data
npm run copy-data       # Copy data to public folder
npm run setup           # Install all dependencies
```

### Backend Package.json

```bash
npm start               # Start production server
npm run dev             # Start with auto-reload
npm run update-data     # Run update_data.sh script
npm run setup           # Install Node + Python deps
```

## Deployment

- **Frontend**: Vercel (free tier)
- **Backend**: Railway or Render ($5-10/month)
- **Data Updates**: GitHub Actions (automated)

See `DEPLOYMENT.md` for detailed instructions.

## Maintenance

### Regular Tasks

- **Every 6 hours**: GitHub Actions updates data automatically
- **Weekly**: Check API costs in OpenAI/Anthropic dashboards  
- **Monthly**: Review and optimize market data size

### Monitoring

- Backend logs: Railway/Render dashboard
- Frontend logs: Vercel dashboard
- Data updates: GitHub Actions tab
