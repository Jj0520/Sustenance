# 🚀 Sustenance - Railway Deployment Guide

## Prerequisites
- GitHub account
- Railway account (sign up at railway.app)
- Your code pushed to GitHub repository

## Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done)
2. **Ensure these files are in your repo:**
   - `railway.json` ✅ (created)
   - `server/railway.toml` ✅ (created)  
   - `client/railway.toml` ✅ (created)

## Step 2: Deploy Backend to Railway

1. **Go to Railway.app** and sign in
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your Sustenance repository**
5. **Railway will detect your services automatically**

### Configure Backend Service:
1. **Select the backend service**
2. **Go to Variables tab**
3. **Add these environment variables:**

```env
DATABASE_URL=postgresql://jjlim:npg_vkfzlprwGJ18@ep-fragrant-wind-a1u7i59x-pooler.ap-southeast-1.aws.neon.tech/sustenance_db?sslmode=require
JWT_SECRET=1234567890
GEMINI_API_KEY=AIzaSyAkORp4kS8aRVAOPJDcMNBJ-1DzzTO7wsQ
NODE_ENV=production
PORT=5001
DB_HOST=ep-fragrant-wind-a1u7i59x-pooler.ap-southeast-1.aws.neon.tech
DB_PORT=5432
DB_NAME=sustenance_db
DB_USER=jjlim
DB_PASSWORD=npg_vkfzlprwGJ18
SESSION_SECRET=SustenanceSessionSecret2024VerySecureKey
CORS_ORIGINS=*
RATE_LIMIT_MAX=100
JWT_EXPIRES_IN=24h
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_DIR=uploads
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
APTOS_NETWORK=testnet
APTOS_MODULE_ADDRESS=0xc13e62a4b2451363bd7f23ff81a19f26bd8a4b5a99794265e17592d7f3282876
```

4. **Set Root Directory** to `server`
5. **Railway will automatically deploy**

## Step 3: Deploy Frontend to Railway

1. **Add another service** to your project
2. **Connect the same GitHub repo**
3. **Configure Frontend Service:**
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx serve -s build -p $PORT`

### Add Frontend Environment Variables:
```env
REACT_APP_API_URL=https://your-backend-service-url.railway.app
```

## Step 4: Update CORS Settings

1. **Get your frontend URL** from Railway (e.g., `https://sustenance-frontend.railway.app`)
2. **Update backend CORS_ORIGINS** variable:
```env
CORS_ORIGINS=https://your-frontend-url.railway.app,http://localhost:3000,http://localhost:3002
```

## Step 5: Test Your Deployment

1. **Backend Health Check**: `https://your-backend-url.railway.app/test`
2. **Frontend**: `https://your-frontend-url.railway.app`

## 🎯 Quick Setup Commands

If you want to deploy from command line:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy backend
cd server && railway up

# Deploy frontend  
cd ../client && railway up
```

## 🔧 Troubleshooting

### Issue: "Module not found"
**Solution**: Ensure all dependencies are in package.json

### Issue: "Database connection failed"
**Solution**: Check DATABASE_URL environment variable

### Issue: "CORS errors"
**Solution**: Update CORS_ORIGINS with your frontend URL

### Issue: "Build failed"
**Solution**: Check build logs in Railway dashboard

## 📋 Environment Variables Checklist

**Backend Variables:**
- [ ] DATABASE_URL
- [ ] JWT_SECRET  
- [ ] GEMINI_API_KEY
- [ ] NODE_ENV
- [ ] CORS_ORIGINS

**Frontend Variables:**
- [ ] REACT_APP_API_URL

## 🌐 Your Live URLs

After deployment, you'll get:
- **Backend**: `https://sustenance-backend-xxx.railway.app`
- **Frontend**: `https://sustenance-frontend-xxx.railway.app`

## 💰 Railway Free Tier

- **$5 credit per month**
- **750 hours of usage**
- **Automatic sleep after 1 hour of inactivity**
- **Custom domains supported**

Your app should easily fit within the free tier limits! 