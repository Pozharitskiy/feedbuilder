import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import express from "express";
import path from "path";

const appUrl = process.env.APP_URL!;
const hostName = new URL(appUrl).hostname;

// Инициализация SQLite session storage
const dbPath = path.join(process.cwd(), "feedbuilder.db");
const sessionStorage = new SQLiteSessionStorage(dbPath);

console.log("🔧 Shopify config:", {
  appUrl,
  hostName,
  apiKey: process.env.SHOPIFY_API_KEY,
  hasSecret: !!process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES,
  dbPath,
});

export const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "read_products").split(","),
    hostName,
    apiVersion: ApiVersion.October24,
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  webhooks: {
    path: "/webhooks",
  },
  sessionStorage,
  appUrl,
});

export function ensureInstalled() {
  console.log("ensureInstalled");
  const router = express.Router();

  const authMiddleware = shopify.auth.begin();

  // Middleware для проверки shop параметра
  const validateShop = (req: any, res: any, next: any) => {
    console.log("📦 Install request:", req.query);
    const { shop } = req.query;
    if (!shop) {
      console.log("❌ Missing shop parameter");
      return res.status(400).send("Missing shop param");
    }
    console.log(`🚀 Starting OAuth for shop: ${shop}`);
    next();
  };

  // /install/
  router.get("/", validateShop, authMiddleware);

  // /install (без слэша)
  router.get("", validateShop, authMiddleware);

  return router;
}
