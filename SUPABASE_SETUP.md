# 🗄️ Supabase Setup Guide

FeedBuilderly now uses **Supabase PostgreSQL** instead of SQLite for better reliability and scalability.

## Why Supabase?

✅ **Persistent storage** - No more data loss on deployments  
✅ **Managed database** - No need to configure volumes  
✅ **Free tier** - 500MB database free forever  
✅ **Backups** - Automatic daily backups  
✅ **Scalable** - Easy to upgrade as you grow  

---

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project (choose a region close to your users)
4. Wait for the database to be ready (~2 minutes)

### 2. Run SQL Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Paste and click "Run"
4. You should see: `Success. No rows returned`

### 3. Get API Credentials

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (the long key starting with `eyJ...`)

### 4. Update Environment Variables

Add to your Fly.io app secrets:

```bash
fly secrets set SUPABASE_URL="https://your-project.supabase.co"
fly secrets set SUPABASE_KEY="your-anon-key-here"
```

Or for local development, create `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 5. Deploy

```bash
npm run build
fly deploy
```

Done! Your app now uses Supabase for all data storage.

---

## 📊 Verifying Setup

After deployment, check the logs:

```bash
fly logs
```

You should see:

```
✅ Supabase client initialized
✅ Database tables initialized
✅ Billing database initialized
```

Then visit your app and install it on a Shopify store. In Supabase dashboard → **Table Editor**, you should see data in the `sessions` table.

---

## 🔍 Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_KEY"

**Solution:** Make sure you set the environment variables:

```bash
fly secrets list
```

Should show both `SUPABASE_URL` and `SUPABASE_KEY`.

### Error: "relation 'sessions' does not exist"

**Solution:** Run the SQL schema in Supabase SQL Editor.

### Sessions not saving

**Solution:** 
1. Check Supabase logs in dashboard → **Database** → **Logs**
2. Verify RLS policies are correct (run schema again)
3. Check that you're using the **service_role key** not **anon key** if RLS is enabled

---

## 💾 Database Schema

### `sessions` table
Stores Shopify OAuth sessions (online & offline tokens).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Session ID (e.g., `offline_shop.myshopify.com`) |
| shop | TEXT | Shop domain |
| data | JSONB | Session data (token, scopes, etc) |
| created_at | TIMESTAMPTZ | When session was created |
| updated_at | TIMESTAMPTZ | Last update time |

### `feed_cache` table
Caches generated product feeds.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-increment ID |
| shop | TEXT | Shop domain |
| format | TEXT | Feed format (google-shopping, yandex-yml, etc) |
| content | TEXT | Feed XML/CSV content |
| products_count | INTEGER | Number of products in feed |
| created_at | TIMESTAMPTZ | When feed was generated |

### `subscriptions` table
Stores billing subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| shop | TEXT | Shop domain (primary key) |
| plan_name | TEXT | Plan: free, basic, pro, enterprise |
| status | TEXT | Status: active, cancelled, trial |
| charge_id | TEXT | Shopify charge ID |
| activated_at | TIMESTAMPTZ | When subscription started |
| expires_at | TIMESTAMPTZ | When subscription expires |
| trial_ends_at | TIMESTAMPTZ | When trial ends |

---

## 🔄 Migration from SQLite

If you were using SQLite before:

1. **Sessions**: Will be regenerated when users reinstall the app
2. **Feed cache**: Will be regenerated on first request (automatic)
3. **Subscriptions**: Need manual migration if you have paying customers

To migrate subscriptions:

```sql
-- Export from SQLite
sqlite3 feedbuilder.db "SELECT * FROM subscriptions;"

-- Import to Supabase (in SQL Editor)
INSERT INTO subscriptions (shop, plan_name, status, charge_id, activated_at, trial_ends_at)
VALUES
  ('shop1.myshopify.com', 'pro', 'active', '12345', '2024-01-01', '2024-01-15'),
  ('shop2.myshopify.com', 'basic', 'active', '12346', '2024-01-02', '2024-01-16');
```

---

## 💰 Pricing

Supabase Free Tier:
- ✅ **500MB database** (plenty for most apps)
- ✅ **Unlimited API requests**
- ✅ **2GB bandwidth**
- ✅ **7 days of log retention**

Pro Tier ($25/month):
- **8GB database**
- **50GB bandwidth**
- **Daily backups**
- **Priority support**

---

## 🎯 Next Steps

- ✅ Set up Supabase project
- ✅ Run SQL schema
- ✅ Add environment variables
- ✅ Deploy to Fly.io
- ✅ Test OAuth installation
- ✅ Verify data is saving

Need help? Check Supabase docs at [supabase.com/docs](https://supabase.com/docs)

