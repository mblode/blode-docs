# Vercel Monorepo Deployment Setup

Your code is ready to deploy! Follow these steps to set up each app on Vercel:

## 1. Web App

1. Go to https://vercel.com/new
2. Select "Import from GitHub"
3. Choose repository: **mblode/neue-docs**
4. Configure project:
   - **Project Name**: web
   - **Root Directory**: apps/web
   - **Framework Preset**: Next.js
   - **Build Command**: (auto-detected from vercel.json)
   - **Output Directory**: (auto-detected from vercel.json)
5. Click "Deploy"

## 2. Dashboard App

1. Go to https://vercel.com/new
2. Select "Import from GitHub"
3. Choose repository: **mblode/neue-docs**
4. Configure project:
   - **Project Name**: dashboard
   - **Root Directory**: apps/dashboard
   - **Framework Preset**: Next.js
5. Click "Deploy"

## 3. Docs App

1. Go to https://vercel.com/new
2. Select "Import from GitHub"
3. Choose repository: **mblode/neue-docs**
4. Configure project:
   - **Project Name**: docs
   - **Root Directory**: apps/docs
   - **Framework Preset**: Next.js
5. Click "Deploy"

## 4. API App

1. Go to https://vercel.com/new
2. Select "Import from GitHub"
3. Choose repository: **mblode/neue-docs**
4. Configure project:
   - **Project Name**: api
   - **Root Directory**: apps/api
   - **Framework Preset**: Other
5. Click "Deploy"

## Automatic Deployments

Once set up, every push to `main` will automatically deploy all apps!

## Deployment URLs

After setup, your apps will be available at:

- Web: https://web-blode.vercel.app
- Dashboard: https://dashboard-blode.vercel.app
- Docs: https://docs-blode.vercel.app
- API: https://api-blode.vercel.app
