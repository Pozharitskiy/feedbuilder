# Fixes Applied for Vercel Deployment

## Issues Fixed

### 1. ✅ Missing `hostName` in Shopify Configuration
**Problem**: Shopify API Library required `hostName` parameter
**Solution**: Added `hostName` extraction from `APP_URL` in `src/shopify.ts`

```typescript
const hostName = new URL(appUrl).hostname;
```

### 2. ✅ Missing `vercel.json` Configuration
**Problem**: Vercel didn't know how to route requests
**Solution**: Created `vercel.json` with proper routing configuration

### 3. ✅ `better-sqlite3` Incompatibility with Vercel
**Problem**: Native SQLite module (`better-sqlite3`) doesn't work on Vercel serverless
**Solution**: Switched to `@libsql/client` (Turso) - serverless SQLite alternative

**Changes made**:
- Replaced `better-sqlite3` with `@libsql/client` in `package.json`
- Updated `src/db.ts` to use async LibSQL client
- Made all database functions async
- Updated all route files to await database calls

### 4. ✅ Missing `vercel-build` Script
**Problem**: Vercel couldn't find the build command
**Solution**: Added `vercel-build` script to `package.json`

## Files Modified

1. **`src/shopify.ts`** - Added `hostName` configuration
2. **`src/db.ts`** - Complete rewrite to use LibSQL instead of better-sqlite3
3. **`src/routes/auth.ts`** - Added `await` to database calls
4. **`src/routes/feed.ts`** - Added `await` to database calls
5. **`src/routes/webhooks.ts`** - Added `await` to database calls
6. **`package.json`** - Replaced dependency, added `vercel-build` script
7. **`vercel.json`** - Created new file
8. **`.vercelignore`** - Created new file
9. **`DEPLOYMENT.md`** - Updated with Turso setup instructions

## Next Steps

### For Local Development

1. **Create `.env` file** with your configuration:
```bash
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SCOPES=read_products,write_products
APP_URL=http://localhost:3000
```

2. **Run the app**:
```bash
npm run build
npm start
```

### For Vercel Deployment

1. **Set up Turso database** (required for production):
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login and create database
turso auth login
turso db create feedbuilder

# Get credentials
turso db show feedbuilder
turso db tokens create feedbuilder
```

2. **Configure Vercel environment variables**:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SCOPES`
   - `APP_URL` (your Vercel URL)
   - `TURSO_DATABASE_URL` (from Turso)
   - `TURSO_AUTH_TOKEN` (from Turso)

3. **Deploy**:
```bash
git add .
git commit -m "Fix Vercel deployment issues"
git push origin main
```

Vercel will automatically deploy from GitHub.

## Why These Changes Were Needed

1. **Shopify API**: The library requires `hostName` for proper initialization
2. **Vercel Routing**: Serverless functions need explicit routing configuration
3. **Database**: Vercel serverless functions are stateless and can't use native binaries like SQLite
4. **Build Process**: Vercel needs to know how to compile TypeScript

## Benefits of New Setup

✅ **Fully serverless** - No server maintenance needed
✅ **Auto-scaling** - Handles traffic spikes automatically
✅ **Global CDN** - Fast response times worldwide
✅ **Cost-effective** - Pay only for what you use
✅ **Zero downtime** - Vercel handles deployments gracefully

## Database: Local vs Production

- **Local Development**: Uses local SQLite file (`feedbuilder.db`)
- **Production (Vercel)**: Uses Turso (serverless SQLite)

Both are SQLite-compatible, so your data schema remains the same!

