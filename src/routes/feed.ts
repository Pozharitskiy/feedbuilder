import type { Request, Response } from "express";
import { ShopifyClient } from "../services/shopifyClient.js";
import { FeedBuilder } from "../services/feedBuilder.js";
import { feedCacheStorage } from "../db.js";
import { sessionStorage } from "../shopify.js";
import {
  FeedFormat,
  IMPLEMENTED_FORMATS,
  isImplemented,
  FEED_CATEGORIES,
} from "../types/feed.js";
import { billingService } from "../services/billingService.js";
import { isPlanAllowed, PLANS } from "../types/billing.js";

export const feedRoutes = (app: any) => {
  // HTML page with all available feeds
  app.get("/feeds", async (req: Request, res: Response) => {
    const shop = req.query.shop as string;
    
    if (!shop) {
      return res.status(400).send("Missing shop parameter");
    }

    // Get subscription to check available formats
    const subscription = await billingService.getSubscription(shop);
    if (!subscription) {
      return res.status(400).send("Subscription not found");
    }

    const plan = PLANS[subscription.planName];
    const availableFormats = plan.formats === "all" 
      ? IMPLEMENTED_FORMATS 
      : IMPLEMENTED_FORMATS.filter(f => ["google", "facebook", "csv"].includes(f));

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeedBuilderly - Available Feeds</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e27;
      background-image:
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%);
      min-height: 100vh;
      padding: 60px 24px;
      color: white;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 16px;
    }
    .subtitle {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 18px;
      margin-bottom: 48px;
    }
    .plan-badge {
      text-align: center;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(12px);
      padding: 14px 28px;
      border-radius: 100px;
      color: rgba(255,255,255,0.95);
      margin: 0 auto 60px;
      display: inline-block;
      border: 1px solid rgba(255,255,255,0.1);
      font-weight: 500;
    }
    .feeds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    .feed-card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 24px;
      transition: all 0.3s;
      cursor: pointer;
    }
    .feed-card:hover {
      transform: translateY(-4px);
      background: rgba(255,255,255,0.06);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
    }
    .feed-name {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: rgba(255,255,255,0.95);
    }
    .feed-url {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      font-family: monospace;
      word-break: break-all;
      margin-top: 12px;
      padding: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 8px;
      transition: all 0.3s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6);
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 48px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Your Feeds</h1>
    <p class="subtitle">Available feed formats for ${shop}</p>
    
    <div style="text-align: center;">
      <div class="plan-badge">
        Current Plan: <strong>${plan.displayName}</strong>
      </div>
    </div>

    <div class="feeds-grid">
      ${availableFormats.map(format => `
        <div class="feed-card" onclick="window.open('/feed/${shop}/${format}', '_blank')">
          <div class="feed-name">${format.toUpperCase()}</div>
          <div class="feed-url">/feed/${shop}/${format}</div>
        </div>
      `).join('')}
    </div>

    <div class="back-link">
      <a href="/?shop=${shop}" class="button">← Back to Dashboard</a>
      <a href="/billing/pricing?shop=${shop}" class="button">Change Plan</a>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  });

  // Получить список всех поддерживаемых форматов
  app.get("/api/formats", (req: Request, res: Response) => {
    res.json({
      totalFormats: Object.values(FEED_CATEGORIES).flat().length,
      implementedFormats: [...IMPLEMENTED_FORMATS],
      implementedCount: IMPLEMENTED_FORMATS.length,
      categories: FEED_CATEGORIES,
      message: "Use GET /feed/:shop/:format to generate a feed",
    });
  });

  // Получить товары магазина (для тестирования и preview)
  app.get("/api/products/:shop", async (req: Request, res: Response) => {
    try {
      const { shop } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      console.log(`📦 Fetching products for shop: ${shop}`);

      // Получить токен из Shopify sessionStorage
      let session = await sessionStorage.loadSession(`offline_${shop}`);

      if (!session) {
        console.log(`⚠️ No offline session for ${shop}, trying online`);
        session = await sessionStorage.loadSession(`online_${shop}`);
      }

      if (!session) {
        console.log(`❌ Shop ${shop} not found in session storage`);
        return res.status(404).json({
          error: "Shop not found",
          message: "This shop has not installed the app yet",
        });
      }

      console.log(`✅ Found session for ${shop}`);

      // Получить товары через Shopify API
      const client = new ShopifyClient(shop, session.accessToken!);
      const products = await client.getAllProducts();

      console.log(
        `✅ Successfully fetched ${products.length} products for ${shop}`
      );

      res.json({
        shop: session.shop,
        productsCount: products.length,
        products: products.slice(0, limit), // Отдаем только первые N для preview
        _meta: {
          total: products.length,
          limit,
          message:
            limit < products.length
              ? `Showing first ${limit} of ${products.length} products`
              : "Showing all products",
        },
      });
    } catch (error: any) {
      console.error("❌ Error fetching products:", error);
      res.status(500).json({
        error: "Failed to fetch products",
        message: error.message,
      });
    }
  });

  // Генерация фида для магазина (с кэшированием)
  app.get("/feed/:shop/:format", async (req: Request, res: Response) => {
    try {
      const { shop, format } = req.params;
      const forceRefresh = req.query.refresh === "true";

      console.log(
        `🔨 Feed request: ${format} for ${shop}${
          forceRefresh ? " (force refresh)" : ""
        }`
      );

      // Валидация формата
      if (!isImplemented(format)) {
        return res.status(400).json({
          error: "Invalid or not yet implemented format",
          message: `Currently supported formats: ${IMPLEMENTED_FORMATS.join(
            ", "
          )}`,
          requestedFormat: format,
        });
      }

      // Проверка что магазин установил приложение
      let session = await sessionStorage.loadSession(`offline_${shop}`);

      if (!session) {
        console.log(`⚠️ No offline session for ${shop}, trying online`);
        session = await sessionStorage.loadSession(`online_${shop}`);
      }

      if (!session) {
        return res.status(404).json({
          error: "Shop not found",
          message: "This shop has not installed the app yet",
        });
      }

      // 💰 BILLING: Check subscription and plan limits
      const subscription = await billingService.getSubscription(shop);
      if (!subscription) {
        return res.status(404).json({
          error: "Subscription not found",
          message: "Please contact support",
        });
      }

      const client = new ShopifyClient(shop, session.accessToken!);
      const products = await client.getAllProducts();
      const productsCount = products.length;

      const planCheck = isPlanAllowed(
        subscription.planName,
        format,
        productsCount
      );

      if (!planCheck.allowed) {
        return res.status(403).json({
          error: "Plan limit exceeded",
          message: planCheck.reason,
          currentPlan: subscription.planName,
          upgradeUrl: `/pricing?shop=${shop}`,
          details: {
            format,
            productsCount,
            maxProducts: PLANS[subscription.planName].maxProducts,
          },
        });
      }

      // Проверяем кэш (если не force refresh)
      if (!forceRefresh) {
        const cached = await feedCacheStorage.getCache(shop, format);
        if (cached) {
          const cacheAge = Date.now() - new Date(cached.created_at).getTime();
          console.log(
            `✅ Serving cached ${format} feed for ${shop} (age: ${Math.round(
              cacheAge / 1000 / 60
            )} min)`
          );

          // Устанавливаем правильный content-type
          const csvFormats = ["ceneo", "idealo", "bol", "prisjakt", "csv"];
          if (csvFormats.includes(format)) {
            res.type("text/csv");
          } else {
            res.type("application/xml");
          }

          res.set({
            "Cache-Control": "public, max-age=21600", // 6 hours
            "X-Products-Count": cached.products_count.toString(),
            "X-Cache": "HIT",
            "X-Generated-At": new Date(cached.created_at).toISOString(),
          });

          return res.send(cached.content);
        }
      }

      console.log(`🔧 Generating fresh ${format} feed for ${shop}`);

      // Генерация фида
      const builder = new FeedBuilder({
        format: format as FeedFormat,
        shop,
        title: `${shop} Product Feed`,
        currency: "USD",
        filterByAvailability: req.query.available === "true",
        filterByStatus: true,
        includeVariants: true,
      });

      const result = await builder.build();

      // Сохраняем в кэш
      await feedCacheStorage.saveCache(
        shop,
        format,
        result.content,
        result.variantsCount
      );

      console.log(
        `✅ Feed generated and cached: ${result.productsCount} products, ${result.variantsCount} variants`
      );

      // Устанавливаем правильный content-type
      const csvFormats = ["ceneo", "idealo", "bol", "prisjakt", "csv"];
      if (csvFormats.includes(format)) {
        res.type("text/csv");
      } else {
        res.type("application/xml");
      }

      // Добавляем заголовки для кэширования
      res.set({
        "Cache-Control": "public, max-age=21600", // 6 hours
        "X-Products-Count": result.productsCount.toString(),
        "X-Variants-Count": result.variantsCount.toString(),
        "X-Cache": "MISS",
        "X-Generated-At": new Date(result.generatedAt).toISOString(),
      });

      res.send(result.content);
    } catch (error: any) {
      console.error("❌ Feed generation error:", error);
      res.status(500).json({
        error: "Feed generation failed",
        message: error.message,
      });
    }
  });
};
