import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import express from "express";
import { customSessionStorage } from "./db.js";
const appUrl = process.env.APP_URL;
const hostName = new URL(appUrl).hostname;
console.log("🔧 Shopify config:", {
    appUrl,
    hostName,
    apiKey: process.env.SHOPIFY_API_KEY,
    hasSecret: !!process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES,
    sessionStorage: "customSessionStorage (direct DB)",
});
// Use our custom session storage instead of Shopify's SQLiteSessionStorage
export const sessionStorage = customSessionStorage;
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
    useOnlineTokens: false, // 🔥 Request offline tokens for billing
    isEmbeddedApp: false, // 🔥 Disable embedded mode for OAuth (cookies work outside iframe)
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
