import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import express from "express";

const appUrl = process.env.APP_URL!;
const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecret = process.env.SHOPIFY_API_SECRET!;
const scopes = (process.env.SCOPES || "").split(",");

export const shopify = shopifyApp({
  api: {
    apiKey,
    apiSecretKey: apiSecret,
    apiVersion: "2024-10" as any,
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
    return await (shopify.auth.begin as any)({ req, res });
  });
  return router;
}

