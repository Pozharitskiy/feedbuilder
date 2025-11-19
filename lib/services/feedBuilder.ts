import { create } from "xmlbuilder2";
import { ShopifyClient } from "./shopifyClient";
import { sessionStorage } from "../shopify";
import { FeedConfig, FeedGenerationResult } from "../types/feed";
import { ShopifyProduct } from "../types/shopify";

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
        const facebookResult = await this.buildGoogleShopping();
        content = facebookResult.content;
        productsCount = facebookResult.productsCount;
        variantsCount = facebookResult.variantsCount;
        break;

      case "allegro":
        const allegroResult = await this.buildAllegro();
        content = allegroResult.content;
        productsCount = allegroResult.productsCount;
        variantsCount = allegroResult.variantsCount;
        break;

      case "ceneo":
        const ceneoResult = await this.buildCeneo();
        content = ceneoResult.content;
        productsCount = ceneoResult.productsCount;
        variantsCount = ceneoResult.variantsCount;
        break;

      case "idealo":
        const idealoResult = await this.buildIdealo();
        content = idealoResult.content;
        productsCount = idealoResult.productsCount;
        variantsCount = idealoResult.variantsCount;
        break;

      case "rtb-house":
        const rtbResult = await this.buildRTBHouse();
        content = rtbResult.content;
        productsCount = rtbResult.productsCount;
        variantsCount = rtbResult.variantsCount;
        break;

      case "empik":
        const empikResult = await this.buildEmpik();
        content = empikResult.content;
        productsCount = empikResult.productsCount;
        variantsCount = empikResult.variantsCount;
        break;

      case "kaufland":
        const kauflandResult = await this.buildKaufland();
        content = kauflandResult.content;
        productsCount = kauflandResult.productsCount;
        variantsCount = kauflandResult.variantsCount;
        break;

      case "criteo":
      case "microsoft-ads":
      case "zalando":
      case "amazon":
      case "shopzilla":
        const globalResult = await this.buildGoogleShopping();
        content = globalResult.content;
        productsCount = globalResult.productsCount;
        variantsCount = globalResult.variantsCount;
        break;

      case "heureka":
        const heurekaResult = await this.buildHeureka();
        content = heurekaResult.content;
        productsCount = heurekaResult.productsCount;
        variantsCount = heurekaResult.variantsCount;
        break;

      case "bol":
        const bolResult = await this.buildBol();
        content = bolResult.content;
        productsCount = bolResult.productsCount;
        variantsCount = bolResult.variantsCount;
        break;

      case "prisjakt":
        const prisjaktResult = await this.buildPrisjakt();
        content = prisjaktResult.content;
        productsCount = prisjaktResult.productsCount;
        variantsCount = prisjaktResult.variantsCount;
        break;

      case "kelkoo":
        const kelkooResult = await this.buildKelkoo();
        content = kelkooResult.content;
        productsCount = kelkooResult.productsCount;
        variantsCount = kelkooResult.variantsCount;
        break;

      case "glami":
        const glamiResult = await this.buildGlami();
        content = glamiResult.content;
        productsCount = glamiResult.productsCount;
        variantsCount = glamiResult.variantsCount;
        break;

      case "trovaprezzi":
        const trovaprezziResult = await this.buildTrovaprezzi();
        content = trovaprezziResult.content;
        productsCount = trovaprezziResult.productsCount;
        variantsCount = trovaprezziResult.variantsCount;
        break;

      case "pricerunner":
        const pricerunnerResult = await this.buildPriceRunner();
        content = pricerunnerResult.content;
        productsCount = pricerunnerResult.productsCount;
        variantsCount = pricerunnerResult.variantsCount;
        break;

      case "twenga":
        const twengaResult = await this.buildTwenga();
        content = twengaResult.content;
        productsCount = twengaResult.productsCount;
        variantsCount = twengaResult.variantsCount;
        break;

      default:
        throw new Error(`Format ${this.config.format} not yet implemented`);
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
    // Load offline session first (used for background jobs)
    let session = await sessionStorage.loadSession(
      `offline_${this.config.shop}`
    );

    // Fallback to online session if offline not found
    if (!session) {
      session = await sessionStorage.loadSession(`online_${this.config.shop}`);
    }

    if (!session) {
      throw new Error(`Shop ${this.config.shop} not found in session storage`);
    }

    const client = new ShopifyClient(this.config.shop, session.accessToken!);
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

  // 🇵🇱 Allegro XML format
  private async buildAllegro() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("offers", {
      xmlns: "http://www.allegro.pl/offer/standard",
    });

    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;

        const offer = root.ele("offer");
        offer.ele("id").txt(v.id.split("/").pop() || v.id);
        offer
          .ele("name")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        offer
          .ele("price", { currency: this.config.currency || "PLN" })
          .txt(v.price);
        offer.ele("stock").txt(v.availableForSale ? "1" : "0");
        offer
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          offer
            .ele("image")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        offer
          .ele("description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 1000)
          );
        if (product.vendor) offer.ele("vendor").txt(product.vendor);
        if (product.productType) offer.ele("category").txt(product.productType);
        if (v.sku) offer.ele("ean").txt(v.sku);
      }
    }

    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇵🇱 Ceneo CSV format
  private async buildCeneo() {
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    const rows = [
      "id;product_name;price;delivery_cost;product_url;image_url;category;producer;description;stock",
    ];

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;

        const row = [
          v.id.split("/").pop() || v.id,
          `${product.title}${
            v.title !== "Default Title" ? ` - ${v.title}` : ""
          }`,
          v.price,
          "0", // delivery cost
          product.onlineStoreUrl ||
            `https://${this.config.shop}/products/${product.handle}`,
          v.image?.url || product.images?.edges[0]?.node.url || "",
          product.productType || "Inne",
          product.vendor || this.config.shop,
          this.stripHtml(product.description || product.title).slice(0, 500),
          v.availableForSale ? "Dostępny" : "Niedostępny",
        ];
        rows.push(row.join(";"));
      }
    }

    return { content: rows.join("\n"), productsCount, variantsCount };
  }

  // 🇩🇪 Idealo CSV format
  private async buildIdealo() {
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    const rows = [
      "sku;product_name;brand;price;shipping_costs;product_url;image_url;category;description;availability",
    ];

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;

        const row = [
          v.sku || v.id.split("/").pop() || v.id,
          `${product.title}${
            v.title !== "Default Title" ? ` - ${v.title}` : ""
          }`,
          product.vendor || "",
          v.price,
          "0.00",
          product.onlineStoreUrl ||
            `https://${this.config.shop}/products/${product.handle}`,
          v.image?.url || product.images?.edges[0]?.node.url || "",
          product.productType || "",
          this.stripHtml(product.description || product.title).slice(0, 500),
          v.availableForSale ? "auf Lager" : "nicht verfügbar",
        ];
        rows.push(row.join(";"));
      }
    }

    return { content: rows.join("\n"), productsCount, variantsCount };
  }

  // 🇪🇺 RTB House - uses Google Shopping format
  private async buildRTBHouse() {
    return this.buildGoogleShopping();
  }

  // 🇵🇱 Empik XML format
  private async buildEmpik() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("offers");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;

        const offer = root.ele("offer", { id: v.id.split("/").pop() || v.id });
        offer
          .ele("name")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        offer.ele("price").txt(v.price);
        offer
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          offer
            .ele("image")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        offer.ele("category").txt(product.productType || "Inne");
        offer.ele("available").txt(v.availableForSale ? "true" : "false");
      }
    }

    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇩🇪 Kaufland XML format
  private async buildKaufland() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("products");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;

      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;

        const item = root.ele("product");
        item.ele("id").txt(v.id.split("/").pop() || v.id);
        item
          .ele("title")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("price").txt(v.price);
        item
          .ele("link")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("image_link")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        item
          .ele("availability")
          .txt(v.availableForSale ? "in stock" : "out of stock");
        item
          .ele("description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 1000)
          );
        if (product.vendor) item.ele("brand").txt(product.vendor);
        if (product.productType)
          item.ele("product_type").txt(product.productType);
        if (v.sku) item.ele("sku").txt(v.sku);
      }
    }

    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇨🇿 Heureka XML (Czech/Slovakia)
  private async buildHeureka() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("shop");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        const item = root.ele("shopitem");
        item.ele("item_id").txt(v.id.split("/").pop() || v.id);
        item
          .ele("productname")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("product").txt(product.title);
        item
          .ele("description")
          .txt(this.stripHtml(product.description || "").slice(0, 500));
        item
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        item.ele("price_vat").txt(v.price);
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("imgurl")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        if (product.vendor) item.ele("manufacturer").txt(product.vendor);
      }
    }
    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇳🇱 Bol.com CSV (Netherlands/Belgium)
  private async buildBol() {
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;
    const rows = ["ean;title;price;delivery;url;image;category;brand;stock"];

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        rows.push(
          [
            v.sku || v.id.split("/").pop() || v.id,
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`,
            v.price,
            "0.00",
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`,
            v.image?.url || product.images?.edges[0]?.node.url || "",
            product.productType || "",
            product.vendor || "",
            v.availableForSale ? "Ja" : "Nee",
          ].join(";")
        );
      }
    }
    return { content: rows.join("\n"), productsCount, variantsCount };
  }

  // 🇸🇪 Prisjakt CSV (Scandinavia)
  private async buildPrisjakt() {
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;
    const rows = ["sku;name;price;url;image;brand;category;stock"];

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        rows.push(
          [
            v.sku || v.id.split("/").pop() || v.id,
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`,
            v.price,
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`,
            v.image?.url || product.images?.edges[0]?.node.url || "",
            product.vendor || "",
            product.productType || "",
            v.availableForSale ? "I lager" : "Ej i lager",
          ].join(";")
        );
      }
    }
    return { content: rows.join("\n"), productsCount, variantsCount };
  }

  // 🇫🇷 Kelkoo XML (France + EU)
  private async buildKelkoo() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("products");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        const item = root.ele("product");
        item.ele("offerId").txt(v.id.split("/").pop() || v.id);
        item
          .ele("title")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("price").txt(v.price);
        item
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("image")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        item
          .ele("description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 500)
          );
        item.ele("availability").txt(v.availableForSale ? "1" : "0");
      }
    }
    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇪🇺 GLAMI XML (Fashion EU)
  private async buildGlami() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("glami");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        const item = root.ele("item");
        item.ele("id").txt(v.id.split("/").pop() || v.id);
        item
          .ele("name")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("price").txt(v.price);
        item
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("image_url")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        item
          .ele("description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 500)
          );
        if (product.vendor) item.ele("brand").txt(product.vendor);
        if (product.productType) item.ele("category").txt(product.productType);
        item
          .ele("availability")
          .txt(v.availableForSale ? "in stock" : "out of stock");
      }
    }
    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇮🇹 Trovaprezzi XML (Italy)
  private async buildTrovaprezzi() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("products");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        const item = root.ele("product");
        item.ele("id").txt(v.id.split("/").pop() || v.id);
        item
          .ele("name")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("price").txt(v.price);
        item
          .ele("link")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("image")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        item
          .ele("description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 500)
          );
        if (product.vendor) item.ele("brand").txt(product.vendor);
        if (product.productType) item.ele("category").txt(product.productType);
        item.ele("availability").txt(v.availableForSale ? "Y" : "N");
      }
    }
    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇬🇧 PriceRunner XML (UK + Scandinavia)
  private async buildPriceRunner() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("products");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        const item = root.ele("product");
        item.ele("sku").txt(v.sku || v.id.split("/").pop() || v.id);
        item
          .ele("name")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("price").txt(v.price);
        item
          .ele("url")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("image")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        item
          .ele("description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 300)
          );
        if (product.vendor) item.ele("manufacturer").txt(product.vendor);
        if (product.productType) item.ele("category").txt(product.productType);
        item.ele("stock").txt(v.availableForSale ? "In Stock" : "Out of Stock");
      }
    }
    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }

  // 🇪🇸 Twenga XML (Spain + EU)
  private async buildTwenga() {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("catalog");
    const products = await this.getProducts();
    let productsCount = 0;
    let variantsCount = 0;

    for (const product of products) {
      if (this.config.filterByStatus && product.status !== "ACTIVE") continue;
      productsCount++;
      for (const variantEdge of product.variants.edges) {
        const v = variantEdge.node;
        if (this.config.filterByAvailability && !v.availableForSale) continue;
        variantsCount++;
        const item = root.ele("product");
        item.ele("ProductId").txt(v.id.split("/").pop() || v.id);
        item
          .ele("ProductName")
          .txt(
            `${product.title}${
              v.title !== "Default Title" ? ` - ${v.title}` : ""
            }`
          );
        item.ele("Price").txt(v.price);
        item
          .ele("ProductUrl")
          .txt(
            product.onlineStoreUrl ||
              `https://${this.config.shop}/products/${product.handle}`
          );
        if (v.image?.url || product.images?.edges[0]?.node.url) {
          item
            .ele("ImageUrl")
            .txt(v.image?.url || product.images.edges[0].node.url);
        }
        item
          .ele("Description")
          .txt(
            this.stripHtml(product.description || product.title).slice(0, 500)
          );
        if (product.vendor) item.ele("Brand").txt(product.vendor);
        if (product.productType) item.ele("Category").txt(product.productType);
        item
          .ele("Availability")
          .txt(v.availableForSale ? "in stock" : "out of stock");
      }
    }
    return {
      content: root.end({ prettyPrint: true }),
      productsCount,
      variantsCount,
    };
  }
}
