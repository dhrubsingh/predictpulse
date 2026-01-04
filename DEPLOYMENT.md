# Deployment Guide

Complete guide for deploying Predict Pulse to production.

## Overview

Predict Pulse consists of two parts:
- **Frontend**: React app (deploy to Vercel/Netlify)
- **Backend**: Express API + Python scripts (deploy to Railway/Render)

## Prerequisites

- [ ] GitHub repository created
- [ ] OpenAI API key
- [ ] Anthropic API key
- [ ] Accounts on deployment platforms

## Part 1: Backend Deployment (Railway)

### Option A: Railway (Recommended)

1. **Create Railway Project**
   ```bash
   # Push code to GitHub first
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Click "Add variables" and add:
     ```
     ANTHROPIC_API_KEY=sk-ant-...
     OPENAI_API_KEY=sk-proj-...
     PORT=3001
     NODE_ENV=production
     ```

3. **Configure Build**
   - Root Directory: `backend`
   - Build Command: `npm install && pip install -r requirements.txt`
   - Start Command: `npm start`

4. **Setup Data Updates**
   - Railway will automatically use GitHub Actions to update data
   - Or add a cron job in Railway:
     ```bash
     0 */6 * * * cd /app && npm run update-data
     ```

5. **Get Backend URL**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - Save this for frontend configuration

### Option B: Render

1. **Create Web Service**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```
   Name: predict-pulse-backend
   Root Directory: backend
   Environment: Node
   Build Command: npm install && pip install -r requirements.txt  
   Start Command: npm start
   ```

3. **Add Environment Variables**
   ```
   ANTHROPIC_API_KEY=your_key
   OPENAI_API_KEY=your_key
   NODE_ENV=production
   ```

4. **Enable Auto-Deploy**
   - Enable "Auto-Deploy" from main branch
   - Render will redeploy on every push

## Part 2: Frontend Deployment (Vercel)

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     ```
     Framework Preset: Vite
     Root Directory: ./
     Build Command: npm run build
     Output Directory: dist
     ```

3. **Add Environment Variables**
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

## Part 3: Configure API Endpoint

Update frontend to use production backend:

```javascript
// src/config.js (create this file)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Update API calls in App.jsx:
```javascript
import { API_URL } from './config';

// Replace localhost URLs with:
const response = await fetch(`${API_URL}/api/semantic-search`, {...});
```

## Part 4: Setup Automated Data Updates

### GitHub Actions (Recommended)

1. **Add GitHub Secrets**
   - Go to repository Settings → Secrets → Actions
   - Add:
     - `OPENAI_API_KEY`: Your OpenAI key

2. **Enable Workflow**
   - The `.github/workflows/update-data.yml` will run automatically
   - Runs every 6 hours
   - Can also trigger manually from Actions tab

3. **Verify**
   - Check Actions tab for workflow runs
   - Data files should update in `backend/data/`

### Alternative: Server Cron Job

If using Railway/Render, add a cron service:

```bash
# Railway/Render: Add cron job
0 */6 * * * cd /app && npm run update-data
```

## Part 5: Domain Setup (Optional)

### Vercel Custom Domain

1. Go to project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown

### Backend Custom Domain

1. Railway/Render provide custom domain options
2. Or use Cloudflare for proxying

## Testing Deployment

```bash
# Test backend
curl https://your-backend.up.railway.app/api/health

# Test frontend  
open https://your-app.vercel.app
```

## Monitoring

- **Backend Logs**: Railway/Render dashboard
- **Frontend Logs**: Vercel dashboard
- **GitHub Actions**: Actions tab for data update logs

## Cost Estimates

| Service | Cost |
|---------|------|
| Railway (Backend) | $5-10/month |
| Vercel (Frontend) | Free (hobby) |
| OpenAI API | ~$3/month (6h updates) |
| Anthropic API | Pay-per-use (~$5/month) |
| **Total** | **~$15/month** |

## Troubleshooting

### Backend Not Starting
- Check environment variables are set
- Verify build logs in Railway/Render
- Ensure `requirements.txt` dependencies install

### Frontend Can't Connect to Backend
- Verify VITE_API_URL environment variable
- Check CORS settings in backend
- Ensure backend is deployed and running

### Data Not Updating
- Check GitHub Actions logs
- Verify OPENAI_API_KEY secret is set
- Ensure workflow has write permissions

## Rollback

If deployment fails:
```bash
# Vercel
vercel rollback

# Railway
# Use dashboard to rollback to previous deployment
```

## Support

- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- GitHub Actions: [docs.github.com/actions](https://docs.github.com/actions)
