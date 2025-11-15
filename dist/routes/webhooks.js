import { feedCacheStorage } from "../db.js";
import { feedUpdater } from "../services/feedUpdater.js";
export const webhookRoutes = (app) => {
    /**
     * Shopify Webhooks handler
     * Автоматически инвалидирует кэш при изменении товаров
     */
    app.post("/webhooks", async (req, res) => {
        try {
            const shop = req.header("X-Shopify-Shop-Domain");
            const topic = req.header("X-Shopify-Topic");
            console.log(`📨 Webhook received: ${topic} from ${shop}`);
            if (!shop) {
                console.log("⚠️ No shop domain in webhook");
                return res.sendStatus(200);
            }
            // Инвалидируем кэш при изменении товаров
            const productTopics = [
                "products/create",
                "products/update",
                "products/delete",
            ];
            if (topic && productTopics.some((t) => topic.includes(t))) {
                console.log(`🗑️ Invalidating cache for ${shop} (${topic})`);
                await feedCacheStorage.invalidateCache(shop);
            }
            // Handle app uninstall - cleanup sessions
            if (topic === "app/uninstalled") {
                console.log(`🗑️ App uninstalled for ${shop}, cleaning up sessions...`);
                const { sessionStorage } = await import("../shopify.js");
                await sessionStorage.deleteSession(`offline_${shop}`);
                await sessionStorage.deleteSession(`online_${shop}`);
                await feedCacheStorage.invalidateCache(shop);
                console.log(`✅ Cleaned up all data for ${shop}`);
            }
            res.sendStatus(200);
        }
        catch (error) {
            console.error("❌ Webhook error:", error);
            res.sendStatus(500);
        }
    });
    /**
     * Ручное обновление фидов для магазина
     */
    app.post("/api/regenerate/:shop", async (req, res) => {
        try {
            const { shop } = req.params;
            console.log(`🔄 Manual feed regeneration requested for ${shop}`);
            // Инвалидируем старый кэш
            await feedCacheStorage.invalidateCache(shop);
            // Запускаем фоновое обновление
            feedUpdater.updateAllFeeds().catch((err) => {
                console.error("Background update error:", err);
            });
            res.json({
                success: true,
                message: `Feed regeneration started for ${shop}`,
            });
        }
        catch (error) {
            console.error("❌ Regenerate error:", error);
            res.status(500).json({
                error: "Failed to regenerate feeds",
                message: error.message,
            });
        }
    });
    /**
     * Получить информацию о фидах магазина
     */
    app.get("/api/feed-info/:shop", async (req, res) => {
        try {
            const { shop } = req.params;
            const feeds = await feedCacheStorage.getAllCachedFeeds(shop);
            const feedUrls = ["google-shopping", "yandex-yml", "facebook"].map((format) => ({
                format,
                url: `${process.env.APP_URL}/feed/${shop}/${format}`,
                cached: feeds.some((f) => f.format === format),
                age: feeds.find((f) => f.format === format)
                    ? Math.round((Date.now() -
                        new Date(feeds.find((f) => f.format === format).created_at).getTime()) /
                        1000 /
                        60)
                    : null,
            }));
            res.json({
                shop,
                feeds: feedUrls,
                totalCached: feeds.length,
            });
        }
        catch (error) {
            res.status(500).json({
                error: "Failed to get feed info",
                message: error.message,
            });
        }
    });
};
