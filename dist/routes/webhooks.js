import { feedCacheStorage } from "../db.js";
import { feedUpdater } from "../services/feedUpdater.js";
export const webhookRoutes = (app) => {
    /**
     * Shopify Webhooks handler
     * Автоматически инвалидирует кэш при изменении товаров
     */
    app.post("/webhooks", (req, res) => {
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
                feedCacheStorage.invalidateCache(shop);
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
            feedCacheStorage.invalidateCache(shop);
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
    app.get("/api/feed-info/:shop", (req, res) => {
        try {
            const { shop } = req.params;
            const feeds = feedCacheStorage.getAllCachedFeeds(shop);
            const feedUrls = ["google-shopping", "yandex-yml", "facebook"].map((format) => ({
                format,
                url: `${process.env.APP_URL}/feed/${shop}/${format}`,
                cached: feeds.some((f) => f.format === format),
                age: feeds.find((f) => f.format === format)
                    ? Math.round((Date.now() - feeds.find((f) => f.format === format).createdAt) /
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
