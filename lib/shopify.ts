import { shopifyApp } from "@shopify/shopify-app-express";
import { SessionStorage } from "@shopify/shopify-app-session-storage";
import { ApiVersion } from "@shopify/shopify-api";
import { customSessionStorage } from "./db";

if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
  throw new Error("Missing required Shopify environment variables");
}

const appUrl = process.env.APP_URL || "https://feedbuilder.fly.dev";

export const sessionStorage = customSessionStorage as SessionStorage;

export const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "read_products,write_products").split(","),
    hostName: appUrl.replace("https://", ""),
    hostScheme: "https",
    apiVersion: ApiVersion.October24,
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage,
  useOnlineTokens: false, // 🔥 Request offline tokens for billing
});

// Helper to ensure shop is installed
export async function ensureInstalled(shop: string) {
  const offlineSession = await sessionStorage.loadSession(`offline_${shop}`);
  if (!offlineSession) {
    throw new Error("Shop not installed");
  }
  return offlineSession;
}
