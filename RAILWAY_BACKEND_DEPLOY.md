# Railway Backend Deployment Guide

Since the data files are too large for GitHub (256MB+), we'll deploy the backend code and generate data files directly on Railway.

## Step 1: Deploy Backend to Railway

1. **Go to [Railway.app](https://railway.app)** and sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `predictpulse` repository
   - Railway will auto-detect it's a Node.js project

3. **Configure the Service**
   - Root Directory: `/backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Add Environment Variables**
   Click "Variables" and add:
   ```
   ANTHROPIC_API_KEY=your_anthropic_key_here
   OPENAI_API_KEY=your_openai_key_here
   PORT=3001
   NODE_ENV=production
   ```

5. **Deploy**
   - Railway will automatically build and deploy
   - You'll get a URL like: `https://your-app.railway.app`

## Step 2: Generate Data Files on Railway

After deployment, you need to generate the data files. You have two options:

### Option A: Use Railway CLI (Recommended)

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Link to your project**
   ```bash
   cd backend
   railway link
   ```

4. **Run the data update script**
   ```bash
   railway run npm run update-data
   ```

   This will:
   - Fetch Kalshi markets
   - Fetch Polymarket markets
   - Generate embeddings
   - Save all data to `backend/data/` on Railway

### Option B: Add a Deploy Hook

1. Create `backend/railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run update-data && npm start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

2. This will run `update-data` on every deployment (can be slow)

### Option C: Manual One-Time Setup

1. **SSH into Railway** (from Railway CLI):
   ```bash
   railway shell
   ```

2. **Run the scripts manually**:
   ```bash
   cd scripts
   python3 get_kalshi.py
   python3 get_polymarket.py
   python3 generate_embeddings.py
   ```

## Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
   (Use your actual Railway URL)

4. Redeploy your Vercel app to apply the changes

## Step 4: Set Up Automatic Data Updates

To keep data fresh every 6 hours, use Railway Cron Jobs:

1. **Create a new service in Railway**
   - Click "New" → "Empty Service"
   - Name it "Data Updater"

2. **Configure Cron**
   - Add same environment variables (OPENAI_API_KEY)
   - Set schedule: `0 */6 * * *` (every 6 hours)
   - Command: `cd /app/backend && npm run update-data`

## Step 5: Verify Everything Works

1. **Check Railway logs** to ensure data generation succeeded
2. **Visit your Vercel app**
3. **Try the AI Assistant** - it should now connect to Railway backend
4. **Search for markets** - semantic search should work

## Troubleshooting

### Issue: "Event embeddings not found"
- Run `railway run npm run update-data` to generate data files

### Issue: CORS errors
- Ensure Railway URL is added to CORS in `backend/server.js`:
  ```javascript
  app.use(cors({
    origin: ['https://your-vercel-app.vercel.app', 'http://localhost:5173']
  }));
  ```

### Issue: API calls failing
- Check Vercel environment variable `VITE_API_URL` is correct
- Verify Railway service is running (check Railway dashboard)

## Cost Estimate

- **Railway**: ~$5-10/month (512MB RAM should be enough)
- **Data updates**: ~$0.50 per run (OpenAI embeddings)
- **Total**: ~$15-20/month for full production setup

## Alternative: Skip Embeddings for Initial Deploy

If you want to deploy quickly without embeddings:

1. Comment out semantic search in `server.js`:
   ```javascript
   // app.post('/api/semantic-search', async (req, res) => {
   //   ...
   // });
   ```

2. Use basic text search only (already works in frontend)

3. Add embeddings later when ready
