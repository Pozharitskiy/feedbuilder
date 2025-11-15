# 🚀 Checklist для деплоя

## ✅ Что уже готово

- ✅ Код мигрирован на Supabase PostgreSQL
- ✅ SQLite зависимости удалены
- ✅ npm registry изменён на registry.npmjs.org
- ✅ Все async функции исправлены
- ✅ TypeScript компилируется без ошибок
- ✅ Dockerfile обновлён (убрано DATA_DIR)
- ✅ `useOnlineTokens: false` - запрос offline токенов для биллинга

## 📋 Шаги для деплоя

### 1. Создать Supabase проект

```bash
# 1. Зайти на https://supabase.com
# 2. New Project → выбрать имя и регион
# 3. Подождать ~2 минуты
```

### 2. Создать таблицы в Supabase

```bash
# SQL Editor → вставить и выполнить supabase-schema.sql
```

Или вручную:
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feed_cache (
  id SERIAL PRIMARY KEY,
  shop TEXT NOT NULL,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  products_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop, format)
);

CREATE TABLE subscriptions (
  shop TEXT PRIMARY KEY,
  plan_name TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  charge_id TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
);
```

### 3. Добавить секреты в Fly.io

```bash
# Settings → API в Supabase
fly secrets set SUPABASE_URL="https://xxxxx.supabase.co"
fly secrets set SUPABASE_KEY="eyJhbGc..."

# Проверить
fly secrets list
```

### 4. Деплой

```bash
npm run build
fly deploy
```

### 5. Проверить логи

```bash
fly logs

# Должны увидеть:
# ✅ Supabase client initialized
# ✅ Database tables initialized
# ✅ Billing database initialized
# ✅ FeedBuilderly running on port 8080
```

### 6. Переустановить приложение

**ВАЖНО!** Старые SQLite сессии не будут работать.

```
1. Удалить приложение в Shopify Admin → Apps
2. Установить: https://your-app.fly.dev/install?shop=your-shop.myshopify.com
```

### 7. Проверить OAuth

В логах при установке должно быть:
```
✅ Session found! ID: offline_shop.myshopify.com, Shop: shop.myshopify.com, isOnline: false
✅ Session saved successfully!
```

### 8. Проверить биллинг

```
1. Перейти: /billing/pricing?shop=your-shop.myshopify.com
2. Выбрать план
3. В логах: "✅ Found offline session for shop"
```

## 🐛 Возможные проблемы

### "Missing SUPABASE_URL or SUPABASE_KEY"
```bash
fly secrets set SUPABASE_URL="..."
fly secrets set SUPABASE_KEY="..."
fly deploy
```

### "App not installed" при выборе плана
```bash
# Переустановить приложение для получения offline токена
# /install?shop=your-shop.myshopify.com
```

### "relation 'sessions' does not exist"
```bash
# Выполнить SQL из шага 2 в Supabase
```

## 📊 Мониторинг

```bash
# Статус
curl https://your-app.fly.dev/ping

# Детальная инфа
curl https://your-app.fly.dev/status

# Биллинг статистика
curl https://your-app.fly.dev/billing/stats
```

## 🎉 Готово!

После успешного деплоя:
- ✅ База данных персистентная (не теряется)
- ✅ OAuth работает с offline токенами
- ✅ Биллинг работает
- ✅ Фиды кешируются в PostgreSQL
- ✅ Нет deprecated пакетов

---

## 🔗 Полезные файлы

- `MIGRATION_SUPABASE.md` - детальная инструкция по миграции
- `SUPABASE_SETUP.md` - подробный гайд по Supabase
- `supabase-schema.sql` - SQL схема для БД
- `.env.supabase.example` - пример .env файла
