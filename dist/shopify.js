import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import express from "express";
const appUrl = process.env.APP_URL;
const hostName = new URL(appUrl).hostname;
export const shopify = shopifyApp({
    api: {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
        scopes: (process.env.SCOPES || "").split(","),
        hostName,
        apiVersion: "2025-10",
    },
    auth: {
        path: "/auth",
        callbackPath: "/auth/callback",
    },
    webhooks: {
        path: "/webhooks",
    },
    appUrl,
});
export function ensureInstalled() {
    console.log("ensureInstalled");
    const router = express.Router();
    const authMiddleware = shopify.auth.begin();
    // Middleware для проверки shop параметра
    const validateShop = (req, res, next) => {
        console.log("📦 Install request:", req.query);
        console.log("🔧 Shopify config:", {
            appUrl,
            hostName,
            apiKey: process.env.SHOPIFY_API_KEY,
            hasSecret: !!process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SCOPES,
        });
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
