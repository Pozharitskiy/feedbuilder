import type { Request, Response } from "express";
import { ShopifyClient } from "../services/shopifyClient.js";
import { FeedBuilder } from "../services/feedBuilder.js";
import { sessionStorage, feedCacheStorage } from "../db.js";
import { FeedFormat } from "../types/feed.js";

export const feedRoutes = (app: any) => {
  // Получить товары магазина (для тестирования и preview)
  app.get("/api/products/:shop", async (req: Request, res: Response) => {
    try {
      const { shop } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      console.log(`📦 Fetching products for shop: ${shop}`);

      // Получить токен из БД
      const session = sessionStorage.getSession(shop);
      if (!session) {
        console.log(`❌ Shop ${shop} not found in database`);
        return res.status(404).json({
          error: "Shop not found",
          message: "This shop has not installed the app yet",
        });
      }

      console.log(`✅ Found session for ${shop}`);

      // Получить товары через Shopify API
      const client = new ShopifyClient(session.shop, session.accessToken);
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
      const validFormats: FeedFormat[] = [
        "google-shopping",
        "yandex-yml",
        "facebook",
      ];

      if (!validFormats.includes(format as FeedFormat)) {
        return res.status(400).json({
          error: "Invalid format",
          message: `Supported formats: ${validFormats.join(", ")}`,
        });
      }

      // Проверка что магазин установил приложение
      const session = sessionStorage.getSession(shop);
      if (!session) {
        return res.status(404).json({
          error: "Shop not found",
          message: "This shop has not installed the app yet",
        });
      }

      // Проверяем кэш (если не force refresh)
      if (!forceRefresh) {
        const cached = feedCacheStorage.getCache(shop, format);
        if (cached) {
          console.log(
            `✅ Serving cached ${format} feed for ${shop} (age: ${Math.round(
              (Date.now() - cached.createdAt) / 1000 / 60
            )} min)`
          );

          // Устанавливаем правильный content-type
          if (format === "csv") {
            res.type("text/csv");
          } else {
            res.type("application/xml");
          }

          res.set({
            "Cache-Control": "public, max-age=21600", // 6 hours
            "X-Products-Count": cached.productsCount.toString(),
            "X-Cache": "HIT",
            "X-Generated-At": new Date(cached.createdAt).toISOString(),
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
      feedCacheStorage.saveCache(
        shop,
        format,
        result.content,
        result.variantsCount
      );

      console.log(
        `✅ Feed generated and cached: ${result.productsCount} products, ${result.variantsCount} variants`
      );

      // Устанавливаем правильный content-type
      if (format === "csv") {
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
