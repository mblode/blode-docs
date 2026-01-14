# Vercel Deployment - Final Setup Steps

## ✅ Completed:
- ✅ Created 4 Vercel projects: `web`, `dashboard`, `docs`, `api`
- ✅ Removed unnecessary projects
- ✅ All code pushed to GitHub

## 📋 Next Steps: Connect Projects to GitHub

Each project needs to be connected to your GitHub repository with the correct **Root Directory**. This takes about 30 seconds per project.

### 1. Web App
**URL:** https://vercel.com/blode/web/settings/git

1. Click "Connect Git Repository"
2. Select: **mblode/neue-docs**
3. **Root Directory**: `apps/web`
4. Click "Save"

### 2. Dashboard App
**URL:** https://vercel.com/blode/dashboard/settings/git

1. Click "Connect Git Repository"
2. Select: **mblode/neue-docs**
3. **Root Directory**: `apps/dashboard`
4. Click "Save"

### 3. Docs App
**URL:** https://vercel.com/blode/docs/settings/git

1. Click "Connect Git Repository"
2. Select: **mblode/neue-docs**
3. **Root Directory**: `apps/docs`
4. Click "Save"

### 4. API App
**URL:** https://vercel.com/blode/api/settings/git

1. Click "Connect Git Repository"
2. Select: **mblode/neue-docs**
3. **Root Directory**: `apps/api`
4. Click "Save"

## 🚀 After Setup:

Once connected, Vercel will:
- ✅ Automatically deploy on every `git push` to main
- ✅ Build only the changed apps (thanks to Turborepo)
- ✅ Create preview deployments for pull requests

## 🌐 Your Apps:

After the initial deployment completes:
- **Web**: https://web-blode.vercel.app
- **Dashboard**: https://dashboard-blode.vercel.app  
- **Docs**: https://docs-blode.vercel.app
- **API**: https://api-blode.vercel.app

## 💡 Tip:

You can do all 4 in about 2 minutes total. Just open the URLs above in 4 tabs!
