# Deployment Guide for Vercel

## Prerequisites

1. **Turso Account** (for serverless SQLite database)
   - Sign up at [https://turso.tech](https://turso.tech)
   - Create a new database
   - Get your database URL and auth token

2. **Shopify App**
   - Create a Shopify app in your Partner Dashboard
   - Get API Key and API Secret

## Step 1: Set up Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create a database
turso db create feedbuilder

# Get the database URL
turso db show feedbuilder

# Create an auth token
turso db tokens create feedbuilder
```

## Step 2: Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=read_products,write_products
APP_URL=https://your-app.vercel.app
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
NODE_ENV=production
```

## Step 3: Deploy to Vercel

### Option A: Deploy via GitHub

1. Push your code to GitHub
2. Import the repository in Vercel
3. Vercel will automatically deploy

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Step 4: Update Shopify App URLs

In your Shopify Partner Dashboard, update your app URLs:

- **App URL**: `https://your-app.vercel.app`
- **Allowed redirection URL(s)**: `https://your-app.vercel.app/auth/callback`

## Local Development

For local development, you can use a local SQLite file without Turso:

```bash
# Copy environment variables
cp .env.example .env

# Edit .env and fill in your Shopify credentials
# You can leave TURSO_* variables empty for local dev

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will automatically use a local SQLite file (`feedbuilder.db`) when `TURSO_DATABASE_URL` is not set.

## Architecture

- **API**: Express.js app running as Vercel serverless function
- **Database**: Turso (libSQL) - serverless SQLite compatible database
- **Entry Point**: `/api/index.ts` (Vercel serverless function)

## Troubleshooting

### Database connection issues

If you see database errors, verify:
1. `TURSO_DATABASE_URL` is correctly formatted: `libsql://your-db.turso.io`
2. `TURSO_AUTH_TOKEN` is valid and not expired

### Shopify auth issues

If OAuth fails:
1. Verify `APP_URL` matches your Vercel deployment URL
2. Check redirect URLs in Shopify Partner Dashboard
3. Ensure `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct

## Testing the Deployment

1. **Install endpoint**: `https://your-app.vercel.app/install?shop=yourstore.myshopify.com`
2. **Feed URL**: `https://your-app.vercel.app/feed/{token}.xml`
3. **Regenerate products**: `POST https://your-app.vercel.app/admin/regenerate?shop=yourstore.myshopify.com`

## Monitoring

- Check Vercel logs for runtime errors
- Monitor Turso dashboard for database usage
- Set up error tracking (Sentry, LogRocket, etc.) for production

## Cost Considerations

- **Vercel**: Free tier includes 100GB bandwidth, sufficient for most use cases
- **Turso**: Free tier includes 9GB storage, 1 billion row reads per month
- Both scale automatically with usage
