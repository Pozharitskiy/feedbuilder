// Feed types and configuration

export type FeedFormat =
  | "google-shopping"
  | "facebook"
  | "yandex-yml"
  | "custom-xml"
  | "csv";

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
