import { create } from "xmlbuilder2";
import { ShopifyClient } from "./shopifyClient.js";
import { sessionStorage } from "../db.js";
import { FeedConfig, FeedGenerationResult } from "../types/feed.js";
import { ShopifyProduct } from "../types/shopify.js";

export class FeedBuilder {
  constructor(private config: FeedConfig) {}

  async build(): Promise<FeedGenerationResult> {
    const startTime = Date.now();
    console.log(
      `🔨 Building ${this.config.format} feed for ${this.config.shop}`
    );

    let content: string;
    let productsCount: number;
    let variantsCount: number;

    switch (this.config.format) {
      case "google-shopping":
        const googleResult = await this.buildGoogleShopping();
        content = googleResult.content;
        productsCount = googleResult.productsCount;
        variantsCount = googleResult.variantsCount;
        break;

      case "yandex-yml":
        const yandexResult = await this.buildYandexYML();
        content = yandexResult.content;
        productsCount = yandexResult.productsCount;
        variantsCount = yandexResult.variantsCount;
        break;

      case "facebook":
        // Facebook использует тот же формат что и Google Shopping
        const facebookResult = await this.buildGoogleShopping();
        content = facebookResult.content;
        productsCount = facebookResult.productsCount;
        variantsCount = facebookResult.variantsCount;
        break;

      default:
        throw new Error(`Unsupported format: ${this.config.format}`);
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Feed built in ${duration}ms: ${productsCount} products, ${variantsCount} variants`
    );

    return {
      format: this.config.format,
      shop: this.config.shop,
      content,
      productsCount,
      variantsCount,
      generatedAt: Date.now(),
      cacheKey: `${this.config.shop}:${this.config.format}`,
    };
  }

  private async buildGoogleShopping() {
    const root = create({ version: "1.0", encoding: "UTF-8" })
      .ele("rss", {
        version: "2.0",
        "xmlns:g": "http://base.google.com/ns/1.0",
      })
      .ele("channel");

    root
      .ele("title")
      .txt(this.config.title || `${this.config.shop} Product Feed`);
    root.ele("link").txt(this.config.link || `https://${this.config.shop}`);
    root
      .ele("description")
      .txt(this.config.description || "Product feed for price aggregators");

    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      // Фильтр по статусу
      if (this.config.filterByStatus && product.status !== "ACTIVE") {
        continue;
      }

      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;

        // Фильтр по наличию
        if (this.config.filterByAvailability && !variant.availableForSale) {
          continue;
        }

        variantsCount++;

        const item = root.ele("item");

        // ID
        const variantId = variant.id.split("/").pop();
        item.ele("g:id").txt(variantId || variant.id);

        // Title
        const title =
          variant.title !== "Default Title"
            ? `${product.title} - ${variant.title}`
            : product.title;
        item.ele("g:title").txt(title);

        // Description
        const description = this.stripHtml(
          product.description || product.title
        );
        item.ele("g:description").txt(description.slice(0, 5000)); // Google limit

        // Link
        const productUrl =
          product.onlineStoreUrl ||
          `https://${this.config.shop}/products/${product.handle}`;
        item.ele("g:link").txt(productUrl);

        // Image
        const imageUrl =
          variant.image?.url || product.images?.edges[0]?.node?.url || "";
        if (imageUrl) {
          item.ele("g:image_link").txt(imageUrl);
        }

        // Availability
        item
          .ele("g:availability")
          .txt(variant.availableForSale ? "in stock" : "out of stock");

        // Price
        const currency = this.config.currency || "USD";
        item.ele("g:price").txt(`${variant.price} ${currency}`);

        // Sale price
        if (
          variant.compareAtPrice &&
          parseFloat(variant.compareAtPrice) > parseFloat(variant.price)
        ) {
          item.ele("g:sale_price").txt(`${variant.price} ${currency}`);
        }

        // Brand
        if (product.vendor) {
          item.ele("g:brand").txt(product.vendor);
        }

        // Product type / Category
        if (product.productType) {
          item.ele("g:product_type").txt(product.productType);
        }

        // MPN / SKU
        if (variant.sku) {
          item.ele("g:mpn").txt(variant.sku);
        }

        // Condition
        item.ele("g:condition").txt("new");

        // GTIN (можно добавить если есть в метаданных)
        // item.ele("g:gtin").txt(variant.barcode);
      }
    }

    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  private async buildYandexYML() {
    const root = create({ version: "1.0", encoding: "UTF-8" })
      .ele("yml_catalog", { date: new Date().toISOString().split("T")[0] })
      .ele("shop");

    root.ele("name").txt(this.config.title || this.config.shop);
    root.ele("company").txt(this.config.shop);
    root.ele("url").txt(this.config.link || `https://${this.config.shop}`);

    // Валюты
    const currencies = root.ele("currencies");
    const currency = this.config.currency || "USD";
    currencies.ele("currency", { id: currency, rate: "1" });

    // Категории (будем группировать по productType)
    const categories = root.ele("categories");
    const categoryMap = new Map<string, number>();
    let categoryId = 1;

    const products = await this.getProducts();

    // Собираем уникальные категории
    for (const product of products) {
      if (product.productType && !categoryMap.has(product.productType)) {
        categoryMap.set(product.productType, categoryId);
        categories
          .ele("category", { id: categoryId.toString() })
          .txt(product.productType);
        categoryId++;
      }
    }

    // Оферы
    const offers = root.ele("offers");
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      // Фильтр по статусу
      if (this.config.filterByStatus && product.status !== "ACTIVE") {
        continue;
      }

      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;

        // Фильтр по наличию
        if (this.config.filterByAvailability && !variant.availableForSale) {
          continue;
        }

        variantsCount++;

        const variantId = variant.id.split("/").pop();
        const offer = offers.ele("offer", {
          id: variantId || variant.id,
          available: variant.availableForSale ? "true" : "false",
        });

        // URL
        const productUrl =
          product.onlineStoreUrl ||
          `https://${this.config.shop}/products/${product.handle}`;
        offer.ele("url").txt(productUrl);

        // Price
        offer.ele("price").txt(variant.price);
        offer.ele("currencyId").txt(currency);

        // Category
        if (product.productType && categoryMap.has(product.productType)) {
          offer
            .ele("categoryId")
            .txt(categoryMap.get(product.productType)!.toString());
        }

        // Picture
        const imageUrl =
          variant.image?.url || product.images?.edges[0]?.node?.url;
        if (imageUrl) {
          offer.ele("picture").txt(imageUrl);
        }

        // Name
        const name =
          variant.title !== "Default Title"
            ? `${product.title} - ${variant.title}`
            : product.title;
        offer.ele("name").txt(name);

        // Vendor
        offer.ele("vendor").txt(product.vendor || this.config.shop);

        // Description
        const description = this.stripHtml(
          product.description || product.title
        );
        offer.ele("description").txt(description);

        // Sales notes
        if (
          variant.compareAtPrice &&
          parseFloat(variant.compareAtPrice) > parseFloat(variant.price)
        ) {
          const discount = Math.round(
            ((parseFloat(variant.compareAtPrice) - parseFloat(variant.price)) /
              parseFloat(variant.compareAtPrice)) *
              100
          );
          offer.ele("sales_notes").txt(`Скидка ${discount}%`);
        }
      }
    }

    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  private async getProducts(): Promise<ShopifyProduct[]> {
    const session = sessionStorage.getSession(this.config.shop);
    if (!session) {
      throw new Error(`Shop ${this.config.shop} not found in database`);
    }

    const client = new ShopifyClient(session.shop, session.accessToken);
    return await client.getAllProducts();
  }

  private stripHtml(html: string): string {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp;
      .replace(/&amp;/g, "&") // Replace &amp;
      .replace(/&lt;/g, "<") // Replace &lt;
      .replace(/&gt;/g, ">") // Replace &gt;
      .replace(/&quot;/g, '"') // Replace &quot;
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }
}
