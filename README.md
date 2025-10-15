# 🎉 FeedBuilderly

**Shopify App для автоматической генерации продуктовых фидов для ценовых агрегаторов**

Поддержка: Google Shopping, Yandex Market, Facebook Catalog

---

## 🚀 Фичи

- ✅ **Multi-shop support** - неограниченное количество магазинов
- ✅ **3 формата фидов** - Google Shopping XML, Yandex Market YML, Facebook Catalog
- ✅ **Умное кэширование** - фиды кэшируются на 6 часов
- ✅ **Auto-update** - автоматическое обновление каждые 6 часов
- ✅ **Real-time webhooks** - мгновенная инвалидация при изменении товаров
- ✅ **GraphQL пагинация** - получение всех товаров без ограничений
- ✅ **Keep-alive** - контейнер не засыпает на Fly.io
- ✅ **Monitoring** - health checks и детальная статистика

---

## 📦 Установка

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd feedbuilder
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

Создайте `.env` файл:

```env
APP_URL=https://your-app.fly.dev
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products
PORT=8080
```

### 4. Собрать проект

```bash
npm run build
```

### 5. Запустить локально

```bash
npm start
```

---

## 🚀 Деплой на Fly.io

### 1. Установить Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Войти в Fly.io

```bash
fly auth login
```

### 3. Настроить secrets

```bash
fly secrets set APP_URL=https://feedbuilder.fly.dev
fly secrets set SHOPIFY_API_KEY=your_api_key
fly secrets set SHOPIFY_API_SECRET=your_api_secret
fly secrets set SCOPES=read_products
```

### 4. Задеплоить

```bash
fly deploy
```

### 5. Проверить статус

```bash
fly status
fly logs
```

---

## 📋 API Endpoints

### 🔐 Установка и авторизация

```
GET /install?shop=your-shop.myshopify.com
```

Начало OAuth процесса для установки приложения

```
GET /auth/callback
```

Callback endpoint после авторизации

---

### 📊 Мониторинг

```
GET /ping
```

Health check endpoint

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 3600
}
```

```
GET /status
```

Детальная статистика приложения

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "stats": {
    "shopsInstalled": 2,
    "shops": ["shop1.myshopify.com", "shop2.myshopify.com"],
    "cache": {
      "shop1.myshopify.com": {
        "cachedFeeds": 3,
        "feeds": [
          { "format": "google-shopping", "productsCount": 150, "age": 45 }
        ]
      }
    }
  }
}
```

---

### 🛍️ Получение товаров (JSON)

```
GET /api/products/:shop
```

**Query params:**

- `limit` - количество товаров для preview (default: 50)

**Response:**

```json
{
  "shop": "your-shop.myshopify.com",
  "productsCount": 150,
  "products": [...],
  "_meta": {
    "total": 150,
    "limit": 50,
    "message": "Showing first 50 of 150 products"
  }
}
```

---

### 📦 Генерация фидов (XML)

```
GET /feed/:shop/google-shopping
GET /feed/:shop/yandex-yml
GET /feed/:shop/facebook
```

**Query params:**

- `available=true` - только товары в наличии
- `refresh=true` - принудительное обновление (игнорировать кэш)

**Response headers:**

- `X-Cache: HIT/MISS` - попадание в кэш
- `X-Products-Count` - количество товаров
- `X-Variants-Count` - количество вариантов
- `X-Generated-At` - дата генерации
- `Cache-Control: public, max-age=21600` - 6 часов

**Примеры:**

```bash
# Google Shopping feed
curl https://feedbuilder.fly.dev/feed/your-shop.myshopify.com/google-shopping

# Yandex Market feed
curl https://feedbuilder.fly.dev/feed/your-shop.myshopify.com/yandex-yml

# Force refresh
curl https://feedbuilder.fly.dev/feed/your-shop.myshopify.com/google-shopping?refresh=true

# Only available products
curl https://feedbuilder.fly.dev/feed/your-shop.myshopify.com/google-shopping?available=true
```

---

### 🔧 Управление фидами

```
GET /api/feed-info/:shop
```

Информация о фидах магазина

**Response:**

```json
{
  "shop": "your-shop.myshopify.com",
  "feeds": [
    {
      "format": "google-shopping",
      "url": "https://feedbuilder.fly.dev/feed/your-shop.myshopify.com/google-shopping",
      "cached": true,
      "age": 45
    }
  ],
  "totalCached": 3
}
```

```
POST /api/regenerate/:shop
```

Принудительная регенерация всех фидов для магазина

**Response:**

```json
{
  "success": true,
  "message": "Feed regeneration started for your-shop.myshopify.com"
}
```

---

## 🔔 Webhooks

Приложение автоматически обрабатывает Shopify webhooks:

```
POST /webhooks
```

**Обрабатываемые события:**

- `products/create` - инвалидация кэша
- `products/update` - инвалидация кэша
- `products/delete` - инвалидация кэша

---

## 📊 Форматы фидов

### Google Shopping XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Shop Product Feed</title>
    <item>
      <g:id>12345</g:id>
      <g:title>Product Name</g:title>
      <g:description>Product description</g:description>
      <g:link>https://shop.com/products/handle</g:link>
      <g:image_link>https://cdn.shopify.com/image.jpg</g:image_link>
      <g:price>99.99 USD</g:price>
      <g:availability>in stock</g:availability>
      <g:brand>Brand Name</g:brand>
      <g:condition>new</g:condition>
    </item>
  </channel>
</rss>
```

### Yandex Market YML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2024-01-01">
  <shop>
    <name>Shop Name</name>
    <currencies>
      <currency id="USD" rate="1"/>
    </currencies>
    <categories>
      <category id="1">Category Name</category>
    </categories>
    <offers>
      <offer id="12345" available="true">
        <url>https://shop.com/products/handle</url>
        <price>99.99</price>
        <currencyId>USD</currencyId>
        <categoryId>1</categoryId>
        <picture>https://cdn.shopify.com/image.jpg</picture>
        <name>Product Name</name>
        <vendor>Brand Name</vendor>
        <description>Product description</description>
      </offer>
    </offers>
  </shop>
</yml_catalog>
```

---

## ⚙️ Кэширование

### Как это работает

1. **Первый запрос** - фид генерируется и сохраняется в SQLite
2. **Последующие запросы** - отдается из кэша (X-Cache: HIT)
3. **Через 6 часов** - кэш считается устаревшим, генерируется новый
4. **Background job** - автоматически обновляет все фиды каждые 6 часов
5. **Webhooks** - при изменении товаров кэш инвалидируется немедленно

### Принудительное обновление

```bash
# Через API
curl -X POST https://feedbuilder.fly.dev/api/regenerate/your-shop.myshopify.com

# Через query param
curl https://feedbuilder.fly.dev/feed/your-shop.myshopify.com/google-shopping?refresh=true
```

---

## 🏗️ Архитектура

```
src/
├── index.ts              # Entry point, Express app
├── shopify.ts            # Shopify App config
├── db.ts                 # SQLite database
├── routes/
│   ├── auth.ts          # OAuth routes
│   ├── feed.ts          # Feed generation routes
│   └── webhooks.ts      # Webhook handlers
├── services/
│   ├── shopifyClient.ts # GraphQL client
│   ├── feedBuilder.ts   # Feed generation logic
│   └── feedUpdater.ts   # Background cron jobs
└── types/
    ├── feed.ts          # Feed types
    └── shopify.ts       # Shopify types
```

### База данных (SQLite)

**Таблица `sessions`:**

- Хранит shop credentials
- Access tokens
- Scopes

**Таблица `feed_cache`:**

- Кэшированные фиды
- Timestamp создания
- Количество товаров

---

## 🔧 Разработка

### Структура проекта

```bash
feedbuilder/
├── src/              # TypeScript source
├── dist/             # Compiled JavaScript
├── feedbuilder.db    # SQLite database
├── package.json
├── tsconfig.json
├── Dockerfile
└── fly.toml
```

### Запуск в dev режиме

```bash
npm run build && npm start
```

### Просмотр логов на Fly.io

```bash
fly logs -a feedbuilderly
```

### SSH в контейнер

```bash
fly ssh console -a feedbuilderly
```

---

## 📈 Мониторинг

### Health Checks

```bash
# Basic health check
curl https://feedbuilder.fly.dev/ping

# Detailed status
curl https://feedbuilder.fly.dev/status
```

### Логи

```bash
fly logs -a feedbuilderly
```

### Метрики

- Количество установленных магазинов
- Количество закэшированных фидов
- Возраст кэша
- Uptime

---

## 🎯 Use Cases

### Для владельцев магазинов

1. Установить приложение через `/install`
2. Получить URL фида: `https://feedbuilder.fly.dev/feed/your-shop/google-shopping`
3. Добавить URL в Google Merchant Center / Yandex Market
4. Фид автоматически обновляется каждые 6 часов

### Для разработчиков

1. API для получения товаров в JSON
2. Webhooks для real-time обновлений
3. Ручная регенерация через API
4. Мониторинг и статистика

---

## 🐛 Troubleshooting

### Проблема: Фид не генерируется

**Решение:**

1. Проверьте что магазин установил приложение
2. Проверьте логи: `fly logs`
3. Проверьте статус: `GET /status`

### Проблема: Кэш не обновляется

**Решение:**

1. Принудительное обновление: `?refresh=true`
2. Ручная регенерация: `POST /api/regenerate/:shop`
3. Проверьте что webhooks работают

### Проблема: Контейнер засыпает

**Решение:**
Keep-alive cron должен пинговать `/ping` каждые 25 минут.
Проверьте логи на наличие сообщений "🏓 Keep-alive ping successful"

---

## 📝 TODO

- [ ] Автоматическая регистрация webhooks при установке
- [ ] Admin UI (Embedded Shopify App)
- [ ] CSV формат фидов
- [ ] Поддержка пользовательских настроек фида
- [ ] Rate limiting
- [ ] Улучшенное логирование в файл

---

## 📄 License

MIT

---

## 🤝 Contributing

Pull requests are welcome!

---

## 📧 Support

Для вопросов и поддержки создавайте issue в GitHub.

---

**Made with ❤️ for Shopify merchants**
