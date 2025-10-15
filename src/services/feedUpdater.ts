import cron from "node-cron";
import { sessionStorage, feedCacheStorage } from "../db.js";
import { FeedBuilder } from "./feedBuilder.js";
import { FeedFormat } from "../types/feed.js";

/**
 * Сервис для фоновых обновлений фидов
 */
export class FeedUpdater {
  private isRunning = false;

  /**
   * Запустить cron задачи
   */
  start() {
    // Обновление фидов каждые 6 часов
    cron.schedule("0 */6 * * *", () => {
      this.updateAllFeeds();
    });

    // Keep-alive ping каждые 25 минут (чтобы Fly.io не усыпил контейнер)
    cron.schedule("*/25 * * * *", () => {
      this.keepAlive();
    });

    console.log("✅ Feed updater cron jobs started");
    console.log("   - Feed updates: every 6 hours");
    console.log("   - Keep-alive ping: every 25 minutes");
  }

  /**
   * Обновить все фиды для всех магазинов
   */
  async updateAllFeeds() {
    if (this.isRunning) {
      console.log("⏭️ Feed update already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("🔄 Starting scheduled feed update job");

    try {
      const shops = sessionStorage.getAllShops();
      const formats: FeedFormat[] = [
        "google-shopping",
        "yandex-yml",
        "facebook",
      ];

      console.log(`📦 Updating feeds for ${shops.length} shops`);

      let successCount = 0;
      let errorCount = 0;

      for (const shop of shops) {
        for (const format of formats) {
          try {
            console.log(`   🔨 Updating ${format} for ${shop}...`);

            const builder = new FeedBuilder({
              format,
              shop,
              title: `${shop} Product Feed`,
              currency: "USD",
              filterByAvailability: false,
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

            successCount++;
            console.log(
              `   ✅ ${format} updated for ${shop} (${result.variantsCount} variants)`
            );
          } catch (error: any) {
            errorCount++;
            console.error(
              `   ❌ Failed to update ${format} for ${shop}:`,
              error.message
            );
          }
        }
      }

      console.log(
        `✅ Feed update job completed: ${successCount} successful, ${errorCount} failed`
      );
    } catch (error) {
      console.error("❌ Feed update job error:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Keep-alive ping для предотвращения усыпления контейнера
   */
  private async keepAlive() {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      return;
    }

    try {
      const response = await fetch(`${appUrl}/ping`);
      if (response.ok) {
        console.log("🏓 Keep-alive ping successful");
      } else {
        console.log(`⚠️ Keep-alive ping failed: ${response.status}`);
      }
    } catch (error: any) {
      console.error("❌ Keep-alive ping error:", error.message);
    }
  }

  /**
   * Немедленно обновить фид для конкретного магазина и формата
   */
  async updateFeed(shop: string, format: FeedFormat): Promise<void> {
    console.log(`🔨 Manual feed update: ${format} for ${shop}`);

    const builder = new FeedBuilder({
      format,
      shop,
      title: `${shop} Product Feed`,
      currency: "USD",
      filterByAvailability: false,
      filterByStatus: true,
      includeVariants: true,
    });

    const result = await builder.build();

    feedCacheStorage.saveCache(
      shop,
      format,
      result.content,
      result.variantsCount
    );

    console.log(`✅ Feed updated: ${result.variantsCount} variants`);
  }

  /**
   * Инвалидировать кэш для магазина (например, при изменении товаров)
   */
  invalidateCache(shop: string) {
    feedCacheStorage.invalidateCache(shop);
    console.log(`🗑️ Cache invalidated for ${shop}`);
  }
}

// Singleton instance
export const feedUpdater = new FeedUpdater();
