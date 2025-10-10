# 🚀 Деплой на Vercel - Пошаговая инструкция

## Шаг 1: Установка зависимостей

```bash
npm install
```

## Шаг 2: Первый деплой на Vercel (получить URL)

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Логин в Vercel
vercel login

# Деплой проекта (первый раз)
vercel
```

**Важно:** Нажимайте Enter на всех вопросах (default настройки подходят).

После деплоя вы получите URL типа:

```
https://feedbuilder-xxxxx.vercel.app
```

**💾 Сохраните этот URL!** Он понадобится для Shopify App.

## Шаг 3: Создать App в Shopify Partners

1. Зайдите на https://partners.shopify.com/
2. **Apps** → **Create app** → **Create app manually**
3. Заполните:

   - **App name:** FeedBuilder (или любое имя)
   - **App URL:** `https://feedbuilder-xxxxx.vercel.app`

4. **Configuration** → **URLs**:

   - **App URL:** `https://feedbuilder-xxxxx.vercel.app/install`
   - **Allowed redirection URL(s):**
     ```
     https://feedbuilder-xxxxx.vercel.app/auth
     https://feedbuilder-xxxxx.vercel.app/auth/callback
     ```

5. **Configuration** → **API access scopes**:

   - Включите: `read_products`, `read_inventory`

6. **Configuration** → **Webhooks**:

   - **Products update:** `https://feedbuilder-xxxxx.vercel.app/webhooks/products/update`

7. **💾 Скопируйте из Client credentials:**
   - **Client ID** (это ваш `SHOPIFY_API_KEY`)
   - **Client secret** (это ваш `SHOPIFY_API_SECRET`)

## Шаг 4: Добавить переменные окружения в Vercel

### Вариант A: Через Vercel Dashboard (проще)

1. Зайдите на https://vercel.com/dashboard
2. Выберите проект `feedbuilder`
3. **Settings** → **Environment Variables**
4. Добавьте переменные (для **Production, Preview, Development**):

```
SHOPIFY_API_KEY=ваш_client_id_из_шага_3
SHOPIFY_API_SECRET=ваш_client_secret_из_шага_3
APP_URL=https://feedbuilder-xxxxx.vercel.app
SCOPES=read_products,read_inventory
SESSION_COOKIE_NAME=feedbuilder_sess
NODE_ENV=production
```

### Вариант B: Через CLI (быстрее)

```bash
vercel env add SHOPIFY_API_KEY
# Введите ваш Client ID, выберите Production+Preview+Development

vercel env add SHOPIFY_API_SECRET
# Введите ваш Client Secret, выберите Production+Preview+Development

vercel env add APP_URL
# Введите https://feedbuilder-xxxxx.vercel.app

vercel env add SCOPES
# Введите: read_products,read_inventory

vercel env add SESSION_COOKIE_NAME
# Введите: feedbuilder_sess

vercel env add NODE_ENV
# Введите: production
```

## Шаг 5: Повторный деплой с переменными

```bash
# Production деплой
vercel --prod
```

Готово! 🎉

## Шаг 6: Установить приложение в тестовый магазин

1. В Shopify Partners создайте **Development store** (если еще нет)
2. Перейдите по ссылке:
   ```
   https://feedbuilder-xxxxx.vercel.app/install?shop=ваш-магазин.myshopify.com
   ```
3. Авторизуйтесь и установите приложение

## Шаг 7: Загрузить продукты в кэш

После установки запустите первую загрузку:

```bash
curl -X POST "https://feedbuilder-xxxxx.vercel.app/admin/regenerate?shop=ваш-магазин.myshopify.com"
```

## Шаг 8: Получить feed токен

Feed токен создается автоматически при установке. Чтобы узнать его:

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

## Шаг 9: Проверить XML фид

```bash
curl "https://feedbuilder-xxxxx.vercel.app/feed/{FEED_TOKEN}.xml"
```

Должен вернуться XML с вашими продуктами! ✅

---

## 🔄 Обновление приложения

При изменении кода:

```bash
# Коммит изменений
git add .
git commit -m "update"
git push

# Vercel автоматически задеплоит
# Или вручную:
vercel --prod
```

---

## 🐛 Отладка

Просмотр логов:

```bash
vercel logs
```

Или в dashboard: https://vercel.com/dashboard → ваш проект → **Deployments** → **Functions**

---

## ⚠️ Важно про SQLite на Vercel

SQLite хранится в `/tmp` и **данные НЕ персистентны**!

При каждом cold start данные могут пропасть. Для production используйте:

### Быстрое решение: Vercel Postgres

```bash
# Создать БД
vercel postgres create

# В проекте установить
npm install @vercel/postgres

# Обновить src/db.ts для использования Postgres
```

### Альтернативы:

- **Turso** - serverless SQLite с персистентностью
- **PlanetScale** - serverless MySQL
- **Supabase** - PostgreSQL + real-time

---

## 📝 Чек-лист

- [ ] `npm install`
- [ ] `vercel` (первый деплой)
- [ ] Создать Shopify App
- [ ] Настроить URLs и webhooks в Shopify
- [ ] Добавить env переменные в Vercel
- [ ] `vercel --prod` (повторный деплой)
- [ ] Установить app в магазин
- [ ] Загрузить продукты (`/admin/regenerate`)
- [ ] Получить feed URL
- [ ] Проверить XML фид

**Готово!** 🎉

