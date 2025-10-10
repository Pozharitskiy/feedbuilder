# ⚡ Quick Start - Vercel деплой за 5 минут

## 1️⃣ Деплой на Vercel

```bash
npm install
vercel
```

Сохраните URL: `https://feedbuilder-xxxxx.vercel.app`

## 2️⃣ Создать Shopify App

1. https://partners.shopify.com/ → **Apps** → **Create app manually**
2. **App URL:** `https://feedbuilder-xxxxx.vercel.app/install`
3. **Allowed redirection URLs:**
   ```
   https://feedbuilder-xxxxx.vercel.app/auth
   https://feedbuilder-xxxxx.vercel.app/auth/callback
   ```
4. **API scopes:** `read_products`, `read_inventory`
5. **Webhooks:** `https://feedbuilder-xxxxx.vercel.app/webhooks/products/update`
6. **Копируйте Client ID и Client secret**

## 3️⃣ Добавить env в Vercel

Dashboard: https://vercel.com/dashboard → ваш проект → **Settings** → **Environment Variables**

```
SHOPIFY_API_KEY=<Client_ID>
SHOPIFY_API_SECRET=<Client_secret>
APP_URL=https://feedbuilder-xxxxx.vercel.app
SCOPES=read_products,read_inventory
SESSION_COOKIE_NAME=feedbuilder_sess
NODE_ENV=production
```

## 4️⃣ Повторный деплой

```bash
vercel --prod
```

## 5️⃣ Установить в магазин

```
https://feedbuilder-xxxxx.vercel.app/install?shop=ваш-магазин.myshopify.com
```

## 6️⃣ Загрузить продукты

```bash
curl -X POST "https://feedbuilder-xxxxx.vercel.app/admin/regenerate?shop=ваш-магазин.myshopify.com"
```

## 7️⃣ Получить feed URL

```bash
curl "https://feedbuilder-xxxxx.vercel.app/admin/feed-url?shop=ваш-магазин.myshopify.com"
```

Вернет:
```json
{
  "feed_url": "https://feedbuilder-xxxxx.vercel.app/feed/uuid-токен.xml",
  "feed_token": "uuid-токен"
}
```

## ✅ Готово!

Откройте feed URL в браузере - должен показать XML с продуктами! 🎉

---

**Полная инструкция:** [DEPLOYMENT.md](DEPLOYMENT.md)

