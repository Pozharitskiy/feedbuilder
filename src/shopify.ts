import "dotenv/config";
import { shopifyApp, LATEST_API_VERSION } from "@shopify/shopify-app-express";
import { Shopify, ApiVersion } from "@shopify/shopify-api";
import express from "express";

const appUrl = process.env.APP_URL!;
const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecret = process.env.SHOPIFY_API_SECRET!;
const scopes = (process.env.SCOPES || "").split(",");

export const shopify = shopifyApp({
  api: {
    apiKey,
    apiSecretKey: apiSecret,
    apiVersion: LATEST_API_VERSION as ApiVersion,
    scopes,
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
  const router = express.Router();
  router.get("/install", async (req, res) => {
    const { shop } = req.query as any;
    if (!shop) return res.status(400).send("Missing shop param");
    return await shopify.auth.begin(req, res);
  });
  return router;
}

