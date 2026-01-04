# Quick Start Guide

Get Predict Pulse running in 5 minutes.

## Step 1: Install Dependencies (2 min)

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
pip3 install -r requirements.txt
cd ..
```

Or use the quick command:
```bash
npm run setup
```

## Step 2: Configure API Keys (1 min)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your API keys:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
PORT=3001
NODE_ENV=development
```

## Step 3: Fetch Market Data (2 min)

```bash
# From root directory
npm run update-data
```

This will:
- ✓ Fetch Kalshi markets (~30 seconds)
- ✓ Fetch Polymarket markets (~30 seconds)  
- ✓ Generate embeddings (~60 seconds)

Copy data to frontend:
```bash
npm run copy-data
```

## Step 4: Start Development Servers

```bash
# Option A: Start both at once
npm run dev:all

# Option B: Start separately
# Terminal 1:
npm run dev

# Terminal 2:
cd backend && npm run dev
```

## Step 5: Open Browser

Frontend: http://localhost:5173
Backend API: http://localhost:3001

## Troubleshooting

### "No API key" error
- Make sure you created `backend/.env`
- Check API keys are correct (no spaces)

### "embeddings not found" error
- Run: `npm run update-data`
- Then: `npm run copy-data`

### Port already in use
- Change PORT in `backend/.env`
- Or kill existing process: `lsof -ti:3001 | xargs kill`

## Next Steps

1. **Test the app**
   - Try searching for markets
   - Chat with the AI assistant

2. **Set up GitHub repo**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Deploy** (optional)
   - See `DEPLOYMENT.md` for full guide

4. **Automate data updates**
   - GitHub Actions will run every 6 hours
   - Or set up a local cron job

## Daily Development Workflow

```bash
# 1. Pull latest changes
git pull

# 2. Update data (if needed)
npm run update-data && npm run copy-data

# 3. Start dev servers
npm run dev:all

# 4. Make changes, test, commit
git add .
git commit -m "Your changes"
git push
```

## Common Commands

```bash
# Update market data
npm run update-data

# Copy data to frontend
npm run copy-data

# Start frontend only
npm run dev

# Start backend only  
npm run dev:backend

# Start both
npm run dev:all

# Build for production
npm run build

# Run linter
npm run lint
```

## Questions?

- Check `README.md` for detailed docs
- See `PROJECT_STRUCTURE.md` for architecture
- Read `DEPLOYMENT.md` for deployment help
