import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import express from "express";
const appUrl = process.env.APP_URL;
const hostName = new URL(appUrl).hostname;
console.log("🔧 Shopify config:", {
    appUrl,
    hostName,
    apiKey: process.env.SHOPIFY_API_KEY,
    hasSecret: !!process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES,
});
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
    // /install/
    router.get("/", (req, res) => {
        console.log("📦 Install request:", req.query);
        const { shop } = req.query;
        if (!shop) {
            console.log("❌ Missing shop parameter");
            return res.status(400).send("Missing shop param");
        }
        console.log(`🚀 Starting OAuth for shop: ${shop}`);
        return shopify.auth.begin({ req, res });
    });
    // /install (без слэша)
    router.get("", (req, res) => {
        console.log("📦 Install request (no slash):", req.query);
        const { shop } = req.query;
        if (!shop) {
            console.log("❌ Missing shop parameter");
            return res.status(400).send("Missing shop param");
        }
        console.log(`🚀 Starting OAuth for shop: ${shop}`);
        return shopify.auth.begin({ req, res });
    });
    return router;
}
