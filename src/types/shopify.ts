// Shopify Product Types

export interface ShopifyImage {
  url: string;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  sku?: string;
  availableForSale: boolean;
  inventoryQuantity: number;
  image?: ShopifyImage;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  vendor?: string;
  productType?: string;
  handle: string;
  status: string;
  totalInventory: number;
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  onlineStoreUrl?: string;
}

export interface ShopifyProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}
