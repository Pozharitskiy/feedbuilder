# 🚀 Миграция на Supabase - Краткая инструкция

## ✅ Что сделано

1. ✅ Установлен `@supabase/supabase-js`
2. ✅ Переписан `src/db.ts` для работы с PostgreSQL
3. ✅ Обновлен `src/services/billingService.ts`
4. ✅ Все async функции исправлены
5. ✅ npm registry изменён на `registry.npmjs.org`
6. ✅ Проект успешно компилируется

## 🎯 Что нужно сделать сейчас

### 1. Создать проект в Supabase

```bash
# 1. Зайти на https://supabase.com
# 2. Создать новый проект (выбрать регион близко к пользователям)
# 3. Подождать 2 минуты пока БД создастся
```

### 2. Создать таблицы

Открыть **SQL Editor** в Supabase и выполнить:

```sql
-- Скопировать весь файл supabase-schema.sql и выполнить
```

Или просто запустить:

```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed cache
CREATE TABLE feed_cache (
  id SERIAL PRIMARY KEY,
  shop TEXT NOT NULL,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  products_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop, format)
);

-- Subscriptions
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

### 3. Получить credentials

В Supabase: **Settings** → **API**

Скопировать:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: `eyJhbGc...`

### 4. Добавить в Fly.io

```bash
fly secrets set SUPABASE_URL="https://xxxxx.supabase.co"
fly secrets set SUPABASE_KEY="eyJhbGc..."
```

### 5. Деплой

```bash
npm run build
fly deploy
```

### 6. Проверка

```bash
# Смотрим логи
fly logs

# Должны увидеть:
# ✅ Supabase client initialized
# ✅ Database tables initialized
# ✅ Billing database initialized
```

### 7. Переустановить приложение на Shopify

**ВАЖНО**: Старые сессии в SQLite не перенесутся автоматически!

```
1. Удалить приложение в Shopify Admin
2. Установить заново через /install?shop=your-shop.myshopify.com
```

После установки проверить в Supabase → **Table Editor** → `sessions` - должна появиться запись.

### 8. Протестировать биллинг

```
1. Перейти в /billing/pricing?shop=your-shop.myshopify.com
2. Выбрать любой план
3. В логах должно быть: "✅ Found offline session for shop"
```

## 🐛 Возможные проблемы

### "Missing SUPABASE_URL or SUPABASE_KEY"

```bash
# Проверить что секреты добавлены
fly secrets list

# Должны быть: SUPABASE_URL, SUPABASE_KEY
```

### "relation 'sessions' does not exist"

```bash
# Выполнить SQL из шага 2 в Supabase SQL Editor
```

### "No session found for shop"

```bash
# Переустановить приложение (старые SQLite сессии не работают)
```

## 📊 Мониторинг

```bash
# Логи приложения
fly logs

# Проверка статуса
curl https://your-app.fly.dev/status

# Информация о подписках
curl https://your-app.fly.dev/billing/stats
```

## 💾 Резервные копии

Supabase автоматически делает backup на Pro тарифе.

Для бесплатного тарифа - экспортировать вручную:
1. Supabase → **Database** → **Backups**
2. Или использовать `pg_dump`

---

## 🎉 Готово!

Теперь у вас:
- ✅ Persistent база данных (не теряется при деплое)
- ✅ Автоматические бэкапы
- ✅ Managed PostgreSQL
- ✅ Правильный npm registry

Все должно работать! 🚀

