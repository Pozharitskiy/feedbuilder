// Feed types and configuration

/**
 * Supported feed formats for product catalogs
 * Organized by category for easy navigation
 */
export type FeedFormat =
  // 🌍 Глобальные и поисковые платформы
  | "google-shopping" // Google Merchant Center
  | "microsoft-ads" // Bing / Microsoft Advertising
  | "facebook" // Facebook / Meta Catalog / Instagram Shop
  | "instagram" // Instagram Shopping
  | "tiktok-shop" // TikTok Shop feed
  | "pinterest" // Pinterest Product Catalog
  | "snapchat" // Snapchat Dynamic Ads
  | "twitter" // X (ранее Twitter) Commerce API
  | "reddit-ads" // Reddit Ads Catalog (экспериментальный)
  | "youtube-commerce" // YouTube Shopping / Shorts integration

  // 🏪 Маркетплейсы
  | "amazon" // Amazon Seller Central feed
  | "ebay" // eBay Seller Inventory
  | "etsy" // Etsy feed (via CSV/XML import)
  | "aliexpress" // AliExpress seller feed
  | "alibaba" // Alibaba / 1688 feed
  | "rakuten" // Rakuten Marketplace
  | "walmart" // Walmart Marketplace
  | "target-plus" // Target+
  | "zalando" // Zalando Partner Program
  | "otrium" // Otrium feed
  | "bol" // bol.com (Нидерланды)
  | "kaufland" // Kaufland.de feed
  | "allegro" // Польша (огромный рынок)
  | "ceneo" // Польша (сравнитель цен)
  | "idealo" // Германия / Польша / Чехия
  | "heureka" // Чехия / Словакия
  | "glami" // Fashion-маркетплейс (EU)
  | "favi" // Дом/интерьер (EU)
  | "peppery" // Peppery Marketplace
  | "empik" // Польша (магазин/маркетплейс)
  | "morele" // Польша (электроника)
  | "shopee" // Юго-Восточная Азия / Польша
  | "lazada" // SEA marketplace
  | "ozon" // Россия / СНГ
  | "wildberries" // Россия / СНГ / Польша
  | "mercado-libre" // Латинская Америка
  | "noon" // MENA region (ОАЭ, Саудовская Аравия)

  // 💸 Сравнители цен / каталоги (CPC networks)
  | "prisjakt" // Скандинавия
  | "kelkoo" // EU comparison shopping
  | "shopmania" // Global CSE
  | "shopalike" // EU comparison feed
  | "twenga" // Франция / Германия
  | "pricegrabber" // США
  | "shoppingcom" // (eBay Commerce Network)
  | "idealo-pl" // Польша отдельный
  | "cenowarka" // Польша
  | "okazje" // Польша
  | "nokaut" // Польша (старый, всё ещё активен)

  // 📦 Ретаргетинг / динамическая реклама
  | "criteo" // Criteo Dynamic Retargeting
  | "adroll" // AdRoll feed
  | "rtb-house" // Польша / Европа / Global retargeting
  | "tradedoubler" // Affiliate Network EU
  | "awin" // Affiliate Network EU
  | "impact" // Affiliate Network
  | "outbrain" // Content ads
  | "taboola" // Content discovery feed

  // 📊 Аналитика / BI / Affiliate
  | "affiliate-window" // Awin legacy
  | "partnerize" // Affiliate platform
  | "linkshare" // Rakuten affiliate
  | "commission-junction" // CJ Affiliate
  | "price2spy" // Price monitoring
  | "competera" // Competitor tracking

  // 🧾 Специфичные форматы данных
  | "yandex-yml" // Yandex Market Language XML
  | "custom-xml" // Generic custom XML feed
  | "custom-json" // JSON feed for APIs
  | "csv" // Generic CSV export
  | "tsv" // Tab-separated values
  | "xlsx" // Excel file export
  | "rss" // RSS-based feed
  | "atom" // Atom XML feed
  | "jsonld" // JSON-LD structured data

  // 🧠 Локальные EU каталоги / платформы
  | "shopify-catalog" // Shopify Catalog Export
  | "woocommerce" // WooCommerce feed
  | "magento" // Magento 2 export
  | "prestashop" // PrestaShop export
  | "bigcommerce" // BigCommerce export
  | "shoper" // Польша, SaaS CMS
  | "sky-shop" // Польша, SaaS CMS
  | "comarch-erp" // Польша, ERP интеграция

  // 🧰 Технические / API
  | "feedbuilderly-api" // внутренний API формат
  | "webhooks"
  | "sitemap"
  | "inventory"
  | "price-monitoring"
  | "performance-export"
  | "debug";

/**
 * Implemented feed formats (currently supported)
 */
export const IMPLEMENTED_FORMATS: readonly FeedFormat[] = [
  "google-shopping",
  "yandex-yml",
  "facebook",
] as const;

/**
 * Feed format categories for organization
 */
export const FEED_CATEGORIES = {
  global: [
    "google-shopping",
    "microsoft-ads",
    "facebook",
    "instagram",
    "tiktok-shop",
    "pinterest",
    "snapchat",
    "twitter",
    "reddit-ads",
    "youtube-commerce",
  ] as FeedFormat[],

  marketplaces: [
    "amazon",
    "ebay",
    "etsy",
    "aliexpress",
    "alibaba",
    "rakuten",
    "walmart",
    "target-plus",
    "zalando",
    "otrium",
    "bol",
    "kaufland",
    "allegro",
    "ceneo",
    "idealo",
    "heureka",
    "glami",
    "favi",
    "peppery",
    "empik",
    "morele",
    "shopee",
    "lazada",
    "ozon",
    "wildberries",
    "mercado-libre",
    "noon",
  ] as FeedFormat[],

  comparison: [
    "prisjakt",
    "kelkoo",
    "shopmania",
    "shopalike",
    "twenga",
    "pricegrabber",
    "shoppingcom",
    "idealo-pl",
    "cenowarka",
    "okazje",
    "nokaut",
  ] as FeedFormat[],

  retargeting: [
    "criteo",
    "adroll",
    "rtb-house",
    "tradedoubler",
    "awin",
    "impact",
    "outbrain",
    "taboola",
  ] as FeedFormat[],

  analytics: [
    "affiliate-window",
    "partnerize",
    "linkshare",
    "commission-junction",
    "price2spy",
    "competera",
  ] as FeedFormat[],

  dataFormats: [
    "yandex-yml",
    "custom-xml",
    "custom-json",
    "csv",
    "tsv",
    "xlsx",
    "rss",
    "atom",
    "jsonld",
  ] as FeedFormat[],

  platforms: [
    "shopify-catalog",
    "woocommerce",
    "magento",
    "prestashop",
    "bigcommerce",
    "shoper",
    "sky-shop",
    "comarch-erp",
  ] as FeedFormat[],

  technical: [
    "feedbuilderly-api",
    "webhooks",
    "sitemap",
    "inventory",
    "price-monitoring",
    "performance-export",
    "debug",
  ] as FeedFormat[],
} as const;

/**
 * Check if a feed format is implemented
 */
export function isImplemented(format: string): format is FeedFormat {
  return IMPLEMENTED_FORMATS.includes(format as FeedFormat);
}

/**
 * Get category for a feed format
 */
export function getFeedCategory(format: FeedFormat): string | null {
  for (const [category, formats] of Object.entries(FEED_CATEGORIES)) {
    if (formats.includes(format)) {
      return category;
    }
  }
  return null;
}

export interface FeedConfig {
  format: FeedFormat;
  shop: string;
  title?: string;
  description?: string;
  link?: string;
  currency?: string;
  includeVariants?: boolean;
  filterByAvailability?: boolean;
  filterByStatus?: boolean;
}

export interface FeedGenerationResult {
  format: FeedFormat;
  shop: string;
  content: string;
  productsCount: number;
  variantsCount: number;
  generatedAt: number;
  cacheKey: string;
}
