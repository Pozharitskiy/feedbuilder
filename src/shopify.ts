import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import express from "express";
import path from "path";
import Database from "better-sqlite3";

const appUrl = process.env.APP_URL!;
const hostName = new URL(appUrl).hostname;

// Инициализация SQLite session storage
// Use persistent data directory if mounted, otherwise fallback to cwd
const dataDir = process.env.DATA_DIR || process.cwd();
const dbPath = path.join(dataDir, "feedbuilder.db");
export const sessionStorage = new SQLiteSessionStorage(dbPath);

// Initialize session storage tables (async IIFE)
(async () => {
  try {
    await sessionStorage.ready;
    console.log("✅ Session storage initialized");

    // Clean up corrupted/short tokens (< 50 chars are invalid)
    // Shopify tokens should be 40+ characters like shpca_xxxxxxxx...
    try {
      const db = new Database(dbPath);
      const sessions = db
        .prepare("SELECT * FROM shopify_sessions")
        .all() as any[];

      console.log(`🔍 Found ${sessions.length} sessions in database`);

      for (const session of sessions) {
        try {
          const sessionData = JSON.parse(session.session_data);
          if (sessionData.accessToken && sessionData.accessToken.length < 40) {
            console.warn(
              `⚠️ Deleting invalid session for ${session.shop} (token length: ${sessionData.accessToken.length})`
            );
            db.prepare("DELETE FROM shopify_sessions WHERE id = ?").run(
              session.id
            );
          }
        } catch (e) {
          // If parsing fails, skip
        }
      }
      db.close();
    } catch (cleanupError) {
      console.warn(
        "⚠️ Could not cleanup sessions:",
        (cleanupError as any).message
      );
    }
  } catch (error) {
    console.error("❌ Failed to initialize session storage:", error);
  }
})();

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
    apiVersion: ApiVersion.October25,
    future: {
      unstable_managedPricingSupport: true,
    },
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
