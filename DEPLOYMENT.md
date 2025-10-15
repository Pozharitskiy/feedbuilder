# 🚀 FeedBuilderly - Deployment Guide

## ✅ Что готово

**Stages 1-4 полностью реализованы:**
- Stage 1: Database & Sessions (SQLite + Multi-shop)
- Stage 2: Shopify Products API (GraphQL + Pagination)
- Stage 3: Feed Generation (3 formats)
- Stage 4: Caching & Performance (6h cache + background jobs)

---

## 📁 Созданные/измененные файлы

### Core Files
- `src/db.ts` - SQLite database + session/cache storage
- `src/shopify.ts` - Shopify App config + SQLite session storage
- `src/index.ts` - Express app + health checks + cron starter

### Routes
- `src/routes/auth.ts` - OAuth flow + session saving
- `src/routes/feed.ts` - Products API + Feed generation with caching
- `src/routes/webhooks.ts` - Webhook handlers + cache invalidation

### Services
- `src/services/shopifyClient.ts` - GraphQL client for Shopify API
- `src/services/feedBuilder.ts` - Google Shopping + Yandex YML generators
- `src/services/feedUpdater.ts` - Background cron jobs (6h updates + keep-alive)

### Types
- `src/types/shopify.ts` - Shopify product types
- `src/types/feed.ts` - Feed configuration types

### Documentation
- `README.md` - Complete documentation
- `DEPLOYMENT.md` - This file
- `.dockerignore` - Docker optimization

---

## 🔧 Pre-deployment checklist

### 1. Проверка Shopify Partners Dashboard

Убедитесь что в настройках вашего приложения указано:

**App URL:**
```
https://feedbuilder.fly.dev
```

**Allowed redirection URL(s):**
```
https://feedbuilder.fly.dev/auth/callback
```

**App scopes:**
```
read_products
```

### 2. Проверка Fly.io secrets

```bash
fly secrets list
```

Должны быть установлены:
- `APP_URL`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SCOPES`

Если нет, установите:
```bash
fly secrets set APP_URL=https://feedbuilder.fly.dev
fly secrets set SHOPIFY_API_KEY=your_api_key
fly secrets set SHOPIFY_API_SECRET=your_api_secret
fly secrets set SCOPES=read_products
```

### 3. Сборка проекта

```bash
npm run build
```

Проверьте что нет ошибок компиляции.

---

## 🚀 Deployment

### Опция 1: Прямой деплой

```bash
fly deploy
```

### Опция 2: С проверкой

```bash
# 1. Проверка статуса
fly status

# 2. Деплой
fly deploy

# 3. Проверка логов
fly logs

# 4. Проверка health
curl https://feedbuilder.fly.dev/ping
```

---

## ✅ Post-deployment проверка

### 1. Health Check

```bash
curl https://feedbuilder.fly.dev/ping
```

**Ожидается:**
```json
{"status":"ok","timestamp":1234567890,"uptime":10}
```

### 2. Status Check

```bash
curl https://feedbuilder.fly.dev/status
```

**Ожидается:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "stats": {...}
}
```

### 3. Установка приложения

```
https://feedbuilder.fly.dev/install?shop=feedbuilderly-test.myshopify.com
```

**Ожидается:**
- Редирект на Shopify OAuth
- После авторизации - редирект на `https://SHOP/admin/apps`

### 4. Проверка товаров

```bash
curl https://feedbuilder.fly.dev/api/products/feedbuilderly-test.myshopify.com
```

**Ожидается:**
```json
{
  "shop": "feedbuilderly-test.myshopify.com",
  "productsCount": 150,
  "products": [...]
}
```

### 5. Проверка фида

```bash
curl https://feedbuilder.fly.dev/feed/feedbuilderly-test.myshopify.com/google-shopping
```

**Ожидается:**
- XML response
- Header `X-Cache: MISS` (первый запрос)
- Header `X-Products-Count: 150`

### 6. Проверка кэша

```bash
# Второй запрос - должен быть из кэша
curl -I https://feedbuilder.fly.dev/feed/feedbuilderly-test.myshopify.com/google-shopping
```

**Ожидается:**
- Header `X-Cache: HIT`

---

## 📊 Мониторинг

### Логи в реальном времени

```bash
fly logs -a feedbuilderly
```

### Ожидаемые логи при старте:

```
✅ Database initialized: /app/feedbuilder.db
🔧 Shopify config: { appUrl: '...', ... }
✅ FeedBuilderly running on port 8080
✅ Feed updater cron jobs started
   - Feed updates: every 6 hours
   - Keep-alive ping: every 25 minutes
```

### Ожидаемые логи при работе:

```
📦 Install request: { shop: 'xxx.myshopify.com' }
🚀 Starting OAuth for shop: xxx.myshopify.com
✅ Shop authorized and saved: xxx.myshopify.com
📦 Fetching products for shop: xxx.myshopify.com
✅ Serving cached google-shopping feed for xxx.myshopify.com (age: 45 min)
🏓 Keep-alive ping successful
```

---

## 🐛 Troubleshooting

### Проблема: OAuth не работает

**Симптомы:**
- Переход на `/install` не редиректит на Shopify

**Решение:**
1. Проверьте `fly secrets list`
2. Проверьте URLs в Shopify Partners Dashboard
3. Проверьте логи: `fly logs`

### Проблема: Фиды не генерируются

**Симптомы:**
- 404 на `/feed/:shop/:format`

**Решение:**
1. Проверьте что магазин установил приложение
2. Проверьте `/api/products/:shop` - если работает, значит токен OK
3. Проверьте логи на ошибки GraphQL

### Проблема: Кэш не работает

**Симптомы:**
- Всегда `X-Cache: MISS`

**Решение:**
1. Проверьте что база данных создалась: `fly ssh console` → `ls -la feedbuilder.db`
2. Проверьте логи на ошибки SQLite

### Проблема: Background jobs не работают

**Симптомы:**
- Нет логов "🔄 Starting scheduled feed update job"
- Нет логов "🏓 Keep-alive ping successful"

**Решение:**
1. Проверьте что контейнер не перезапускается
2. Проверьте `fly status`
3. Проверьте uptime в `/status`

---

## 📈 Использование

### Для клиента (владельца магазина)

1. **Установка:**
   ```
   https://feedbuilder.fly.dev/install?shop=SHOP-NAME.myshopify.com
   ```

2. **Получение URL фидов:**
   ```bash
   curl https://feedbuilder.fly.dev/api/feed-info/SHOP-NAME.myshopify.com
   ```

3. **Использование фида:**
   - Google Merchant Center → Add feed → Add URL
   - URL: `https://feedbuilder.fly.dev/feed/SHOP-NAME.myshopify.com/google-shopping`

### Для разработчика

1. **Проверка статистики:**
   ```bash
   curl https://feedbuilder.fly.dev/status
   ```

2. **Принудительное обновление:**
   ```bash
   curl -X POST https://feedbuilder.fly.dev/api/regenerate/SHOP-NAME.myshopify.com
   ```

3. **Получение товаров:**
   ```bash
   curl https://feedbuilder.fly.dev/api/products/SHOP-NAME.myshopify.com
   ```

---

## 🎯 Next Steps (Optional)

### Stage 5: Webhook Registration
- Автоматическая регистрация webhooks при установке
- Не нужно вручную настраивать в Shopify Partners

### Stage 6: Admin UI
- Embedded Shopify App
- Dashboard с графиками
- Управление настройками фидов

### Stage 7: Infrastructure
- Rate limiting
- Логирование в файл
- Backup базы данных

---

## 📝 Важные примечания

1. **База данных** сохраняется между деплоями (volume persistent)
2. **Кэш** сбрасывается при рестарте контейнера
3. **Cron jobs** запускаются сразу после старта
4. **Keep-alive** предотвращает усыпление на Fly.io free tier
5. **Webhooks** нужно настроить в Shopify Partners Dashboard вручную

---

## 🎉 Готово!

Приложение полностью готово к продакшн использованию! 🚀

