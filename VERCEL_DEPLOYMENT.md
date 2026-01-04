# Vercel + Railway Deployment Guide

You've deployed the frontend to Vercel - now deploy the backend!

## ✅ What You've Done

- Frontend deployed to Vercel ✅
- Backend code ready in `/backend` ✅
- API URL configuration added ✅

## 🚀 Deploy Backend (Railway - 5 minutes)

### Step 1: Deploy to Railway

1. **Go to [railway.app](https://railway.app)**
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Root Directory**
   - Click on the deployed service
   - Settings → Root Directory
   - Set to: `backend`
   - Click "Redeploy"

4. **Add Environment Variables**
   - Go to "Variables" tab
   - Click "+ New Variable"
   - Add these one by one:
   
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here  
   PORT=3001
   NODE_ENV=production
   ```

5. **Generate Initial Data**
   
   You have 2 options:

   **Option A: Generate Locally + Commit (Recommended)**
   ```bash
   # On your machine
   cd backend
   npm run update-data
   
   # This creates data/*.json files
   # Temporarily commit them
   git add data/*.json
   git commit -m "Add initial production data"
   git push
   
   # Railway will auto-deploy with the data files
   ```

   **Option B: Manual Upload**
   - Generate data locally: `npm run update-data`
   - Railway CLI: `railway run npm run update-data`

6. **Get Your Backend URL**
   - Railway shows it in the deployment view
   - Copy the URL (like `https://predict-pulse-production.up.railway.app`)

### Step 2: Update Vercel Frontend

1. **Add Backend URL to Vercel**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add new variable:
     ```
     Name: VITE_API_URL
     Value: https://your-railway-url-here.up.railway.app
     ```
   - Click "Save"

2. **Redeploy Frontend**
   - Deployments tab
   - Click "..." on latest deployment → "Redeploy"
   - Or just push a new commit to trigger deploy

### Step 3: Test Production

Visit your Vercel URL and test:
- ✅ Search for markets
- ✅ Try the AI assistant
- ✅ Check that recommendations load

## 🔄 Data Updates (Automated)

Your GitHub Actions workflow will automatically update data every 6 hours!

**To enable:**

1. **Add GitHub Secret**
   - Repository → Settings → Secrets → Actions
   - New secret:
     ```
     Name: OPENAI_API_KEY
     Value: your_openai_api_key
     ```

2. **Verify Workflow**
   - Actions tab → "Update Market Data"
   - Should show scheduled runs every 6 hours
   - Can manually trigger with "Run workflow"

3. **Railway Auto-Deploy**
   - Railway will automatically deploy when data updates
   - Or disable auto-deploy and use data files in repo

## 💰 Cost Breakdown

**Free:**
- Vercel frontend (hobby tier)
- GitHub (repo + actions)

**Paid:**
- Railway: $5/month (500 hours free/month)
- OpenAI API: ~$3/month (for embeddings)
- Anthropic API: ~$5/month (pay-per-use)

**Total: ~$13/month**

## 🐛 Troubleshooting

### "Cannot connect to backend"

**Check:**
1. Backend deployed and running on Railway?
2. `VITE_API_URL` set in Vercel?
3. Frontend redeployed after adding env var?

**Test backend directly:**
```bash
curl https://your-backend.up.railway.app/api/health
```

### "Embeddings not found"

**Solution:**
```bash
# Generate data locally
cd backend
npm run update-data

# Commit and push
git add data/*.json
git commit -m "Update data files"
git push
```

### "API key errors"

**Check Railway variables:**
- Go to Variables tab
- Verify all keys are set correctly
- No extra spaces or quotes

### CORS errors

**Add to backend/server.js** (should already be there):
```javascript
app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

## 🎯 Next Steps

After deployment:

1. **Test Everything**
   - Search functionality
   - AI chat
   - Market recommendations

2. **Monitor Costs**
   - OpenAI dashboard: usage
   - Railway dashboard: hours used
   - Anthropic dashboard: API usage

3. **Set Up Alerts**
   - Railway can email on deploy failures
   - GitHub Actions can notify on workflow failures

4. **Custom Domain** (optional)
   - Vercel: Add custom domain in settings
   - Railway: Add custom domain in service settings

## 📊 Monitoring

**Backend Logs:**
- Railway dashboard → Your service → Logs
- Check for startup errors

**Frontend Logs:**
- Vercel dashboard → Your project → Logs
- Check for API connection errors

**Data Updates:**
- GitHub → Actions tab
- See workflow runs and results

## ✅ Deployment Checklist

Backend (Railway):
- [ ] Repository connected
- [ ] Root directory set to `backend`
- [ ] Environment variables added
- [ ] Data files generated
- [ ] Backend URL obtained

Frontend (Vercel):
- [ ] Already deployed ✅
- [ ] `VITE_API_URL` environment variable added
- [ ] Redeployed after adding env var

Automation:
- [ ] GitHub secret `OPENAI_API_KEY` added
- [ ] Workflow running every 6 hours
- [ ] Data updating successfully

## 🎉 You're Done!

Your full-stack app is now live:
- **Frontend**: Vercel (static site)
- **Backend**: Railway (API server)
- **Data**: Auto-updates via GitHub Actions

Visit your Vercel URL and enjoy! 🚀
