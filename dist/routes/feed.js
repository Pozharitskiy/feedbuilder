import { ShopifyClient } from "../services/shopifyClient.js";
import { FeedBuilder } from "../services/feedBuilder.js";
import { feedCacheStorage } from "../db.js";
import { sessionStorage } from "../shopify.js";
import { IMPLEMENTED_FORMATS, isImplemented, FEED_CATEGORIES, } from "../types/feed.js";
import { billingService } from "../services/billingService.js";
import { isPlanAllowed, PLANS } from "../types/billing.js";
export const feedRoutes = (app) => {
    // Получить список всех поддерживаемых форматов
    app.get("/api/formats", (req, res) => {
        res.json({
            totalFormats: Object.values(FEED_CATEGORIES).flat().length,
            implementedFormats: [...IMPLEMENTED_FORMATS],
            implementedCount: IMPLEMENTED_FORMATS.length,
            categories: FEED_CATEGORIES,
            message: "Use GET /feed/:shop/:format to generate a feed",
        });
    });
    // Получить товары магазина (для тестирования и preview)
    app.get("/api/products/:shop", async (req, res) => {
        try {
            const { shop } = req.params;
            const limit = parseInt(req.query.limit) || 50;
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
            const client = new ShopifyClient(shop, session.accessToken);
            const products = await client.getAllProducts();
            console.log(`✅ Successfully fetched ${products.length} products for ${shop}`);
            res.json({
                shop: session.shop,
                productsCount: products.length,
                products: products.slice(0, limit), // Отдаем только первые N для preview
                _meta: {
                    total: products.length,
                    limit,
                    message: limit < products.length
                        ? `Showing first ${limit} of ${products.length} products`
                        : "Showing all products",
                },
            });
        }
        catch (error) {
            console.error("❌ Error fetching products:", error);
            res.status(500).json({
                error: "Failed to fetch products",
                message: error.message,
            });
        }
    });
    // Генерация фида для магазина (с кэшированием)
    app.get("/feed/:shop/:format", async (req, res) => {
        try {
            const { shop, format } = req.params;
            const forceRefresh = req.query.refresh === "true";
            console.log(`🔨 Feed request: ${format} for ${shop}${forceRefresh ? " (force refresh)" : ""}`);
            // Валидация формата
            if (!isImplemented(format)) {
                return res.status(400).json({
                    error: "Invalid or not yet implemented format",
                    message: `Currently supported formats: ${IMPLEMENTED_FORMATS.join(", ")}`,
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
            const subscription = billingService.getSubscription(shop);
            if (!subscription) {
                return res.status(404).json({
                    error: "Subscription not found",
                    message: "Please contact support",
                });
            }
            const client = new ShopifyClient(shop, session.accessToken);
            const products = await client.getAllProducts();
            const productsCount = products.length;
            const planCheck = isPlanAllowed(subscription.planName, format, productsCount);
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
                const cached = feedCacheStorage.getCache(shop, format);
                if (cached) {
                    console.log(`✅ Serving cached ${format} feed for ${shop} (age: ${Math.round((Date.now() - cached.createdAt) / 1000 / 60)} min)`);
                    // Устанавливаем правильный content-type
                    const csvFormats = ["ceneo", "idealo", "bol", "prisjakt", "csv"];
                    if (csvFormats.includes(format)) {
                        res.type("text/csv");
                    }
                    else {
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
                format: format,
                shop,
                title: `${shop} Product Feed`,
                currency: "USD",
                filterByAvailability: req.query.available === "true",
                filterByStatus: true,
                includeVariants: true,
            });
            const result = await builder.build();
            // Сохраняем в кэш
            feedCacheStorage.saveCache(shop, format, result.content, result.variantsCount);
            console.log(`✅ Feed generated and cached: ${result.productsCount} products, ${result.variantsCount} variants`);
            // Устанавливаем правильный content-type
            const csvFormats = ["ceneo", "idealo", "bol", "prisjakt", "csv"];
            if (csvFormats.includes(format)) {
                res.type("text/csv");
            }
            else {
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
        }
        catch (error) {
            console.error("❌ Feed generation error:", error);
            res.status(500).json({
                error: "Feed generation failed",
                message: error.message,
            });
        }
    });
};
