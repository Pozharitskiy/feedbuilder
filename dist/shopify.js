import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import express from "express";
import path from "path";
import Database from "better-sqlite3";
const appUrl = process.env.APP_URL;
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
        // Force delete all sessions if CLEAR_SESSIONS is set (for debugging/testing)
        const shouldClearSessions = process.env.CLEAR_SESSIONS === "true";
        // Clean up corrupted/short tokens (< 50 chars are invalid)
        // Shopify tokens should be 40+ characters like shpca_xxxxxxxx...
        try {
            const db = new Database(dbPath);
            // Get all tables first
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%session%'").all();
            console.log(`🔍 Found session tables: ${tables.map(t => t.name).join(", ")}`);
            // Try different possible table names
            const possibleTables = ["shopify_sessions", "sessions"];
            for (const tableName of possibleTables) {
                try {
                    const sessions = db.prepare(`SELECT * FROM ${tableName}`).all();
                    console.log(`📊 Found ${sessions.length} sessions in table '${tableName}'`);
                    if (shouldClearSessions) {
                        console.warn(`🗑️ CLEARING ALL SESSIONS (CLEAR_SESSIONS=true)`);
                        db.prepare(`DELETE FROM ${tableName}`).run();
                        console.log(`✅ Deleted all sessions from ${tableName}`);
                        break;
                    }
                    for (const session of sessions) {
                        try {
                            const sessionData = JSON.parse(session.session_data || session.data || "{}");
                            const token = sessionData.accessToken || "";
                            console.log(`Session for ${session.shop || "unknown"}: token length = ${token.length}`);
                            if (token && token.length < 40) {
                                console.warn(`⚠️ Deleting invalid session for ${session.shop} (token length: ${token.length})`);
                                db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(session.id);
                            }
                        }
                        catch (e) {
                            console.warn(`⚠️ Could not parse session:`, e.message);
                        }
                    }
                }
                catch (tableError) {
                    // Table doesn't exist, try next one
                    console.log(`ℹ️ Table ${tableName} not found or error:`, tableError.message);
                }
            }
            db.close();
        }
        catch (cleanupError) {
            console.warn("⚠️ Could not cleanup sessions:", cleanupError.message);
        }
    }
    catch (error) {
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
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
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
    const validateShop = (req, res, next) => {
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
