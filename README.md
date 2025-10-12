# FeedBuilder

Shopify app для генерации фидов товаров.

## Локальная разработка

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
npm start
```

## Deploy

### Render

**Build Command:**
```bash
corepack enable && corepack prepare npm@10.8.2 --activate && npm ci && npm run build
```

**Start Command:**
```bash
node dist/index.js
```

После первого деплоя или при проблемах с кешем:
1. Settings → Build Command — добавьте команду выше (обязательно `&&`, не `;`)
2. Clear build cache
3. Manual Deploy → Deploy latest commit

### Vercel

Достаточно наличия `api/index.ts` и `engines.node=20.x` в `package.json`.

При желании можно добавить `vercel.json`:
```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "nodejs20.x"
    }
  }
}
```

### Переменные окружения

Обе платформы требуют выставить следующие переменные (см. `.env.example`):

- `APP_URL` — URL приложения на платформе
- `SHOPIFY_API_KEY` — API ключ из Shopify Partner Dashboard
- `SHOPIFY_API_SECRET` — API secret из Shopify Partner Dashboard
- `SCOPES` — права доступа (по умолчанию `read_products,read_inventory`)
- `TURSO_DATABASE_URL` — URL базы данных Turso
- `TURSO_AUTH_TOKEN` — токен авторизации Turso

## Технологии

- Node.js 20.x
- TypeScript
- Express
- Shopify API
- Turso (libSQL)

