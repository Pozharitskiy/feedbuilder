import "@shopify/shopify-api/adapters/node";
import { shopifyApi, Session, ApiVersion } from "@shopify/shopify-api";
import { ShopifyProduct, ShopifyProductsResponse } from "../types/shopify";

// Инициализируем Shopify API
const shopifyApiInstance = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: (process.env.SCOPES || "read_products").split(","),
  hostName: new URL(process.env.APP_URL!).hostname,
  apiVersion: ApiVersion.October25,
  isEmbeddedApp: false,
});

export class ShopifyClient {
  constructor(private shop: string, private accessToken: string) {}

  /**
   * Получить все товары магазина с пагинацией через GraphQL
   */
  async getAllProducts(): Promise<ShopifyProduct[]> {
    const products: ShopifyProduct[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    const query = `
      query GetProducts($cursor: String) {
        products(first: 250, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              description
              vendor
              productType
              handle
              status
              totalInventory
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    price
                    compareAtPrice
                    sku
                    availableForSale
                    inventoryQuantity
                    image {
                      url
                    }
                  }
                }
              }
              images(first: 10) {
                edges {
                  node {
                    url
                  }
                }
              }
              onlineStoreUrl
            }
          }
        }
      }
    `;

    try {
      while (hasNextPage) {
        console.log(
          `📦 Fetching products for ${this.shop}${
            cursor ? ` (cursor: ${cursor.slice(0, 20)}...)` : ""
          }`
        );

        const client = new shopifyApiInstance.clients.Graphql({
          session: {
            shop: this.shop,
            accessToken: this.accessToken,
          } as Session,
        });

        const response: any = await client.request(query, {
          variables: { cursor },
        });

        const data = response.data as ShopifyProductsResponse;

        if (data.products?.edges) {
          const fetchedProducts = data.products.edges.map((edge) => edge.node);
          products.push(...fetchedProducts);
          console.log(
            `   ✅ Fetched ${fetchedProducts.length} products (total: ${products.length})`
          );
        }

        hasNextPage = data.products?.pageInfo?.hasNextPage || false;
        cursor = data.products?.pageInfo?.endCursor || null;
      }

      console.log(
        `✅ Total products fetched for ${this.shop}: ${products.length}`
      );
      return products;
    } catch (error: any) {
      console.error(
        `❌ Error fetching products for ${this.shop}:`,
        error.message
      );

      if (error.response?.errors) {
        console.error(
          "GraphQL errors:",
          JSON.stringify(error.response.errors, null, 2)
        );
      }

      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Получить один товар по ID
   */
  async getProduct(productId: string): Promise<ShopifyProduct> {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          vendor
          productType
          handle
          status
          totalInventory
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                availableForSale
                inventoryQuantity
                image {
                  url
                }
              }
            }
          }
          images(first: 10) {
            edges {
              node {
                url
              }
            }
          }
          onlineStoreUrl
        }
      }
    `;

    try {
      const client = new shopifyApiInstance.clients.Graphql({
        session: {
          shop: this.shop,
          accessToken: this.accessToken,
        } as Session,
      });

      const response: any = await client.request(query, {
        variables: { id: productId },
      });

      return response.data.product;
    } catch (error: any) {
      console.error(`❌ Error fetching product ${productId}:`, error.message);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }
}
