#!/bin/bash

# Get Vercel token
TOKEN=$(cat ~/.vercel/auth.json 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Error: Could not find Vercel auth token"
  echo "Please run: vercel login"
  exit 1
fi

TEAM="blode"

echo "Configuring Vercel projects for monorepo..."

# Configure web app
echo "Updating web project..."
curl -X PATCH "https://api.vercel.com/v9/projects/web" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "nextjs",
    "rootDirectory": "apps/web",
    "buildCommand": "npx turbo run build --filter=web...",
    "installCommand": "npm install"
  }' 2>&1 | jq -r '.error.message // "✓ Web project configured"'

# Configure dashboard app
echo "Creating/updating dashboard project..."
curl -X PATCH "https://api.vercel.com/v9/projects/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "nextjs",
    "rootDirectory": "apps/dashboard",
    "buildCommand": "npx turbo run build --filter=dashboard...",
    "installCommand": "npm install"
  }' 2>&1 | jq -r '.error.message // "✓ Dashboard project configured"'

# Configure docs app
echo "Creating/updating docs project..."
curl -X PATCH "https://api.vercel.com/v9/projects/docs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "nextjs",
    "rootDirectory": "apps/docs",
    "buildCommand": "npx turbo run build --filter=docs...",
    "installCommand": "npm install"
  }' 2>&1 | jq -r '.error.message // "✓ Docs project configured"'

# Configure API app
echo "Creating/updating api project..."
curl -X PATCH "https://api.vercel.com/v9/projects/api" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": null,
    "rootDirectory": "apps/api",
    "buildCommand": "npx turbo run build --filter=api...",
    "installCommand": "npm install"
  }' 2>&1 | jq -r '.error.message // "✓ API project configured"'

echo ""
echo "Configuration complete! Now trigger deployments:"
echo "  vercel --prod --cwd=/Users/mblode/Code/mblode/neue-docs"
