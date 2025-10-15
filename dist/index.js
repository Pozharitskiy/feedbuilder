import "dotenv/config";
import express from "express";
import { shopify, ensureInstalled } from "./shopify.js";
import { authRoutes } from "./routes/auth.js";
import { feedRoutes } from "./routes/feed.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { feedUpdater } from "./services/feedUpdater.js";
import { sessionStorage, feedCacheStorage } from "./db.js";
const app = express();
app.use(express.json());
app.use(shopify.cspHeaders());
app.use("/install", ensureInstalled());
authRoutes(app);
feedRoutes(app);
webhookRoutes(app);
// Health check endpoint (для Fly.io и мониторинга)
app.get("/ping", (req, res) => {
    res.json({
        status: "ok",
        timestamp: Date.now(),
        uptime: process.uptime(),
    });
});
// Status endpoint (детальная информация)
app.get("/status", (req, res) => {
    const shops = sessionStorage.getAllShops();
    const cacheStats = {};
    shops.forEach((shop) => {
        const feeds = feedCacheStorage.getAllCachedFeeds(shop);
        cacheStats[shop] = {
            cachedFeeds: feeds.length,
            feeds: feeds.map((f) => ({
                format: f.format,
                productsCount: f.productsCount,
                age: Math.round((Date.now() - f.createdAt) / 1000 / 60), // minutes
            })),
        };
    });
    res.json({
        status: "ok",
        version: "1.0.0",
        uptime: process.uptime(),
        timestamp: Date.now(),
        stats: {
            shopsInstalled: shops.length,
            shops: shops,
            cache: cacheStats,
        },
    });
});
// Root endpoint
app.get("/", (req, res) => {
    res.send("✅ FeedBuilderly backend is running");
});
const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
    console.log(`✅ FeedBuilderly running on port ${port}`);
    console.log(`   App URL: ${process.env.APP_URL}`);
    console.log(`   Port: ${port}`);
    // Запускаем фоновые задачи
    feedUpdater.start();
});
