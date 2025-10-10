# FeedBuilder - Shopify Product Feed Generator

MVP приложение для генерации XML-фидов из продуктов Shopify магазина.

📖 **[Пошаговая инструкция деплоя на Vercel →](DEPLOYMENT.md)**  
⚡ **[Быстрый старт (5 минут) →](QUICKSTART.md)**

## Возможности

- ✅ OAuth авторизация с Shopify
- ✅ Загрузка продуктов через GraphQL API
- ✅ Кэширование продуктов в SQLite
- ✅ Генерация XML-фида по уникальному токену
- ✅ Webhook для обновления фида
- ✅ Готово для деплоя на Vercel

## Быстрый старт

```bash
# Установка
npm install

# Деплой на Vercel
vercel

# Добавить env переменные в Vercel Dashboard
# Повторный деплой
vercel --prod
```

Полная инструкция: [DEPLOYMENT.md](DEPLOYMENT.md)

## API Endpoints

- `GET /install?shop=...` - начало установки
- `GET /auth` - OAuth начало
- `GET /auth/callback` - OAuth callback
- `GET /feed/:token.xml` - публичный XML фид
- `POST /webhooks/products/update` - Shopify webhook
- `POST /admin/regenerate?shop=...` - ручное обновление
- `GET /admin/feed-url?shop=...` - получить feed URL

## Структура проекта

```
feedbuilder/
├── api/
│   └── index.ts           # Vercel serverless entry point
├── src/
│   ├── index.ts           # Express сервер
│   ├── shopify.ts         # Shopify API
│   ├── db.ts              # SQLite база
│   ├── queries.ts         # GraphQL запросы
│   ├── feeds.ts           # XML генератор
│   └── routes/
│       ├── auth.ts        # OAuth
│       ├── feed.ts        # Публичный фид
│       └── webhooks.ts    # Webhooks
├── .nvmrc                 # Node.js версия
├── package.json
├── tsconfig.json
└── vercel.json
```

## Лицензия

MIT

