# FeedBuilderly — Development Roadmap

> **Цель:** Полноценное Shopify приложение для генерации продуктовых фидов (XML/CSV) для ценовых агрегаторов (Google Shopping, Yandex Market, Facebook Catalog, и др.)

---

## ✅ Stage 0 — OAuth & Installation (COMPLETED)

- [x] OAuth flow для установки приложения
- [x] Callback обработка
- [x] Редирект после установки

---

## 🗄️ Stage 1 — Database & Session Storage

### TASK 1.1 — Setup SQLite Database

**Цель:** Использовать SQLite для хранения shop sessions вместо JSON файлов.

**Почему:**

- Поддержка множества магазинов
- Атомарные операции
- Надежность на Fly.io

**Файлы:**

- Создать: `src/db.ts`
- Изменить: `package.json` (добавить `better-sqlite3`)

**Структура таблицы `sessions`:**

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL UNIQUE,
  accessToken TEXT NOT NULL,
  scopes TEXT NOT NULL,
  isOnline INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

**Код:**

```typescript
// src/db.ts
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "feedbuilder.db");
export const db = new Database(dbPath);

// Инициализация таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    shop TEXT NOT NULL UNIQUE,
    accessToken TEXT NOT NULL,
    scopes TEXT NOT NULL,
    isOnline INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_shop ON sessions(shop);
`);

export interface Session {
  id: string;
  shop: string;
  accessToken: string;
  scopes: string;
  isOnline: boolean;
  createdAt: number;
  updatedAt: number;
}
```

---

### TASK 1.2 — Session Storage Integration

**Цель:** Интегрировать SQLite с Shopify session storage.

**Файлы:**

- Изменить: `src/shopify.ts`
- Изменить: `src/routes/auth.ts`

**Код для `shopify.ts`:**

```typescript
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";

const sessionStorage = new SQLiteSessionStorage("feedbuilder.db");

export const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "read_products").split(","),
    hostName: new URL(process.env.APP_URL!).hostname,
    apiVersion: "2025-01",
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  webhooks: {
    path: "/webhooks",
  },
  sessionStorage,
  appUrl: process.env.APP_URL!,
});
```

**Обновить `auth.ts`:**

```typescript
app.get(
  "/auth/callback",
  shopify.auth.callback(),
  async (req: Request, res: Response) => {
    const session = res.locals.shopify.session;
    console.log(`✅ Shop ${session.shop} authorized`);

    // Сохранить в нашу БД (для быстрого доступа)
    db.prepare(
      `
      INSERT OR REPLACE INTO sessions (id, shop, accessToken, scopes, isOnline, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      session.id,
      session.shop,
      session.accessToken,
      session.scope,
      session.isOnline ? 1 : 0,
      Date.now(),
      Date.now()
    );

    res.redirect(`https://${session.shop}/admin/apps`);
  }
);
```

---

## 🛍️ Stage 2 — Shopify Products API

### TASK 2.1 — Shopify Client Service

**Цель:** Создать сервис для работы с Shopify Admin API.

**Файлы:**

- Создать: `src/services/shopifyClient.ts`

**Код:**

```typescript
// src/services/shopifyClient.ts
import { shopify } from "../shopify.js";

export class ShopifyClient {
  constructor(private shop: string, private accessToken: string) {}

  /**
   * Получить все товары магазина с пагинацией
   */
  async getAllProducts() {
    const products = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const query = `
        query GetProducts($cursor: String) {
          products(first: 250, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                description
                vendor
                productType
                handle
                status
                totalInventory
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                      sku
                      availableForSale
                      inventoryQuantity
                      image {
                        url
                      }
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                onlineStoreUrl
              }
            }
          }
        }
      `;

      const client = new shopify.clients.Graphql({
        session: {
          shop: this.shop,
          accessToken: this.accessToken,
        },
      });

      const response = await client.query({
        data: { query, variables: { cursor } },
      });

      const data = response.body as any;
      products.push(...data.data.products.edges.map((e: any) => e.node));

      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
    }

    return products;
  }
}
```

---

### TASK 2.2 — Products Endpoint

**Цель:** API для просмотра товаров магазина.

**Файлы:**

- Изменить: `src/routes/feed.ts`

**Код:**

```typescript
import { ShopifyClient } from "../services/shopifyClient.js";
import { db } from "../db.js";

export const feedRoutes = (app: any) => {
  // Получить товары магазина
  app.get("/api/products/:shop", async (req: Request, res: Response) => {
    try {
      const { shop } = req.params;

      // Получить токен из БД
      const session = db
        .prepare("SELECT * FROM sessions WHERE shop = ?")
        .get(shop);
      if (!session) {
        return res.status(404).json({ error: "Shop not found" });
      }

      const client = new ShopifyClient(session.shop, session.accessToken);
      const products = await client.getAllProducts();

      res.json({
        shop: session.shop,
        productsCount: products.length,
        products: products.slice(0, 50), // First 50 for preview
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
};
```

---

## 🧾 Stage 3 — Feed Generation

### TASK 3.1 — Feed Builder Service

**Цель:** Универсальный генератор фидов для разных форматов.

**Файлы:**

- Создать: `src/services/feedBuilder.ts`
- Создать: `src/types/feed.ts`

**Типы:**

```typescript
// src/types/feed.ts
export type FeedFormat =
  | "google-shopping"
  | "facebook"
  | "yandex-yml"
  | "custom-xml"
  | "csv";

export interface FeedConfig {
  format: FeedFormat;
  shop: string;
  title?: string;
  description?: string;
  link?: string;
  includeVariants?: boolean;
  filterByAvailability?: boolean;
}
```

**Сервис:**

```typescript
// src/services/feedBuilder.ts
import { create } from "xmlbuilder2";
import { ShopifyClient } from "./shopifyClient.js";
import { FeedConfig } from "../types/feed.js";

export class FeedBuilder {
  constructor(private config: FeedConfig) {}

  async build() {
    switch (this.config.format) {
      case "google-shopping":
        return this.buildGoogleShopping();
      case "facebook":
        return this.buildFacebook();
      case "yandex-yml":
        return this.buildYandexYML();
      default:
        throw new Error(`Unsupported format: ${this.config.format}`);
    }
  }

  private async buildGoogleShopping() {
    // Google Shopping XML format
    const root = create({ version: "1.0", encoding: "UTF-8" })
      .ele("rss", {
        version: "2.0",
        "xmlns:g": "http://base.google.com/ns/1.0",
      })
      .ele("channel");

    root
      .ele("title")
      .txt(this.config.title || `${this.config.shop} Product Feed`);
    root.ele("link").txt(`https://${this.config.shop}`);
    root.ele("description").txt(this.config.description || "Product feed");

    const products = await this.getProducts();

    for (const product of products) {
      for (const variant of product.variants.edges) {
        const v = variant.node;

        if (this.config.filterByAvailability && !v.availableForSale) {
          continue;
        }

        const item = root.ele("item");

        item.ele("g:id").txt(v.id);
        item
          .ele("g:title")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("g:description").txt(this.stripHtml(product.description));
        item
          .ele("g:link")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );

        if (v.image?.url || product.images.edges[0]?.node.url) {
          item
            .ele("g:image_link")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }

        item
          .ele("g:availability")
          .txt(v.availableForSale ? "in stock" : "out of stock");
        item.ele("g:price").txt(`${v.price} USD`);

        if (
          v.compareAtPrice &&
          parseFloat(v.compareAtPrice) > parseFloat(v.price)
        ) {
          item.ele("g:sale_price").txt(`${v.price} USD`);
        }

        if (product.vendor) {
          item.ele("g:brand").txt(product.vendor);
        }

        if (product.productType) {
          item.ele("g:product_type").txt(product.productType);
        }

        if (v.sku) {
          item.ele("g:mpn").txt(v.sku);
        }

        item.ele("g:condition").txt("new");
      }
    }

    return root.end({ prettyPrint: true });
  }

  private async buildYandexYML() {
    // Yandex Market YML format
    const root = create({ version: "1.0", encoding: "UTF-8" })
      .ele("yml_catalog", { date: new Date().toISOString().split("T")[0] })
      .ele("shop");

    root.ele("name").txt(this.config.title || this.config.shop);
    root.ele("company").txt(this.config.shop);
    root.ele("url").txt(`https://${this.config.shop}`);

    const currencies = root.ele("currencies");
    currencies.ele("currency", { id: "USD", rate: "1" });

    const categories = root.ele("categories");
    const offers = root.ele("offers");

    const products = await this.getProducts();

    for (const product of products) {
      for (const variant of product.variants.edges) {
        const v = variant.node;

        if (this.config.filterByAvailability && !v.availableForSale) {
          continue;
        }

        const offer = offers.ele("offer", {
          id: v.id,
          available: v.availableForSale ? "true" : "false",
        });

        offer
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        offer.ele("price").txt(v.price);
        offer.ele("currencyId").txt("USD");

        if (product.productType) {
          offer.ele("categoryId").txt(product.productType);
        }

        if (v.image?.url || product.images.edges[0]?.node.url) {
          offer
            .ele("picture")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }

        offer
          .ele("name")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        offer.ele("vendor").txt(product.vendor || this.config.shop);
        offer.ele("description").txt(this.stripHtml(product.description));
      }
    }

    return root.end({ prettyPrint: true });
  }

  private async buildFacebook() {
    // Facebook Product Catalog format (similar to Google Shopping)
    return this.buildGoogleShopping(); // Simplified for now
  }

  private async getProducts() {
    // Implement caching here
    const session = db
      .prepare("SELECT * FROM sessions WHERE shop = ?")
      .get(this.config.shop);
    if (!session) throw new Error("Shop not found");

    const client = new ShopifyClient(session.shop, session.accessToken);
    return await client.getAllProducts();
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
  }
}
```

---

### TASK 3.2 — Feed Endpoints

**Цель:** Public endpoints для получения фидов.

**Файлы:**

- Изменить: `src/routes/feed.ts`

**Код:**

```typescript
app.get("/feed/:shop/:format", async (req: Request, res: Response) => {
  try {
    const { shop, format } = req.params;

    const builder = new FeedBuilder({
      format: format as FeedFormat,
      shop,
      filterByAvailability: true,
      includeVariants: true,
    });

    const feed = await builder.build();

    if (format === "csv") {
      res.type("text/csv");
    } else {
      res.type("application/xml");
    }

    res.send(feed);
  } catch (error) {
    console.error("Feed generation error:", error);
    res.status(500).send("Feed generation failed");
  }
});
```

---

## ⚙️ Stage 4 — Caching & Performance

### TASK 4.1 — Feed Caching

**Цель:** Кэшировать фиды для быстрой отдачи.

**Файлы:**

- Обновить `src/db.ts` (добавить таблицу `feed_cache`)
- Изменить: `src/routes/feed.ts`

**Таблица:**

```sql
CREATE TABLE IF NOT EXISTS feed_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  UNIQUE(shop, format)
);

CREATE INDEX IF NOT EXISTS idx_feed_cache ON feed_cache(shop, format);
```

**Логика:**

```typescript
// Проверить кэш (если младше 6 часов - отдать)
const cached = db
  .prepare(
    "SELECT * FROM feed_cache WHERE shop = ? AND format = ? AND createdAt > ?"
  )
  .get(shop, format, Date.now() - 6 * 60 * 60 * 1000);

if (cached) {
  return res.type("application/xml").send(cached.content);
}

// Генерировать новый
const feed = await builder.build();

// Сохранить в кэш
db.prepare(
  "INSERT OR REPLACE INTO feed_cache (shop, format, content, createdAt) VALUES (?, ?, ?, ?)"
).run(shop, format, feed, Date.now());

res.type("application/xml").send(feed);
```

---

### TASK 4.2 — Background Feed Updates

**Цель:** Обновлять фиды в фоне по расписанию.

**Файлы:**

- Создать: `src/services/feedUpdater.ts`
- Изменить: `src/index.ts`

**Код:**

```typescript
// src/services/feedUpdater.ts
import cron from "node-cron";
import { db } from "../db.js";
import { FeedBuilder } from "./feedBuilder.js";

export function startFeedUpdater() {
  // Каждые 6 часов обновлять все фиды
  cron.schedule("0 */6 * * *", async () => {
    console.log("🔄 Starting feed update job");

    const shops = db.prepare("SELECT DISTINCT shop FROM sessions").all();
    const formats = ["google-shopping", "yandex-yml", "facebook"];

    for (const { shop } of shops) {
      for (const format of formats) {
        try {
          console.log(`Updating ${format} feed for ${shop}`);

          const builder = new FeedBuilder({
            format: format as any,
            shop,
            filterByAvailability: true,
          });

          const feed = await builder.build();

          db.prepare(
            "INSERT OR REPLACE INTO feed_cache (shop, format, content, createdAt) VALUES (?, ?, ?, ?)"
          ).run(shop, format, feed, Date.now());

          console.log(`✅ Updated ${format} feed for ${shop}`);
        } catch (error) {
          console.error(`❌ Failed to update ${format} for ${shop}:`, error);
        }
      }
    }

    console.log("✅ Feed update job completed");
  });
}
```

**В `index.ts`:**

```typescript
import { startFeedUpdater } from "./services/feedUpdater.js";

// После app.listen
startFeedUpdater();
```

---

## 🔔 Stage 5 — Webhooks

### TASK 5.1 — Product Update Webhook

**Цель:** Инвалидировать кэш при изменении товаров.

**Файлы:**

- Изменить: `src/routes/webhooks.ts`

**Код:**

```typescript
shopify.webhooks.addHandlers({
  PRODUCTS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/webhooks",
    callback: async (topic, shop, body) => {
      console.log(`Product created in ${shop}`);
      invalidateFeedCache(shop);
    },
  },
  PRODUCTS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/webhooks",
    callback: async (topic, shop, body) => {
      console.log(`Product updated in ${shop}`);
      invalidateFeedCache(shop);
    },
  },
  PRODUCTS_DELETE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/webhooks",
    callback: async (topic, shop, body) => {
      console.log(`Product deleted in ${shop}`);
      invalidateFeedCache(shop);
    },
  },
});

function invalidateFeedCache(shop: string) {
  db.prepare("DELETE FROM feed_cache WHERE shop = ?").run(shop);
  console.log(`🗑️ Invalidated feed cache for ${shop}`);
}
```

---

## 🎨 Stage 6 — Admin UI

### TASK 6.1 — Embedded App

**Цель:** Shopify Embedded App с UI для управления фидами.

**Файлы:**

- Создать: `frontend/` (Vite + React + Polaris)
- Создать: `src/routes/app.ts`

**Структура:**

```
frontend/
  ├── src/
  │   ├── App.tsx
  │   ├── pages/
  │   │   ├── Dashboard.tsx
  │   │   └── FeedSettings.tsx
  │   └── components/
  │       ├── FeedList.tsx
  │       └── FeedPreview.tsx
  └── package.json
```

**Основные фичи UI:**

- Список всех фидов (Google Shopping, Yandex, Facebook)
- Копирование URL фида
- Ручное обновление фида
- Статистика (последнее обновление, количество товаров)
- Настройки фида (фильтры, форматы)

---

## 🚀 Stage 7 — Infrastructure

### TASK 7.1 — Health Check & Keep-Alive

**Файлы:**

- Изменить: `src/index.ts`

**Код:**

```typescript
// Health check для Fly.io
app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// Keep-alive (ping self every 25 minutes)
cron.schedule("*/25 * * * *", async () => {
  try {
    await fetch(`${process.env.APP_URL}/ping`);
    console.log("🏓 Self-ping successful");
  } catch (error) {
    console.error("❌ Self-ping failed:", error);
  }
});
```

---

### TASK 7.2 — Optimize Docker

**Файлы:**

- Изменить: `Dockerfile`
- Создать: `.dockerignore`

**`.dockerignore`:**

```
src/
.env
.git
node_modules
*.md
.DS_Store
frontend/
```

**Оптимизированный `Dockerfile`:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY feedbuilder.db ./feedbuilder.db 2>/dev/null || true
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

---

### TASK 7.3 — Logging

**Файлы:**

- Создать: `src/utils/logger.ts`

**Код:**

```typescript
import fs from "fs";

export class Logger {
  private logFile = "feedbuilder.log";

  log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    console.log(`[${level}] ${message}`, data || "");

    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + "\n");
  }

  info(message: string, data?: any) {
    this.log("INFO", message, data);
  }

  error(message: string, data?: any) {
    this.log("ERROR", message, data);
  }
}

export const logger = new Logger();
```

---

## 📝 Stage 8 — Documentation

### TASK 8.1 — Update README

**Файлы:**

- Обновить: `README.md`

**Структура:**

- Описание проекта
- Фичи
- Установка и деплой на Fly.io
- API endpoints
- Примеры использования фидов
- Конфигурация

---

## 🎯 Summary

**Порядок выполнения:**

1. ✅ Stage 0 - OAuth (DONE)
2. 🗄️ Stage 1 - Database
3. 🛍️ Stage 2 - Shopify API
4. 🧾 Stage 3 - Feed Generation
5. ⚙️ Stage 4 - Caching
6. 🔔 Stage 5 - Webhooks
7. 🎨 Stage 6 - Admin UI (optional)
8. 🚀 Stage 7 - Infrastructure
9. 📝 Stage 8 - Documentation

**Ключевые улучшения:**

- ✅ Multi-shop support
- ✅ Надежная БД (SQLite)
- ✅ Множество форматов фидов
- ✅ Кэширование
- ✅ Background updates
- ✅ Webhooks для real-time updates
- ✅ Production-ready архитектура
