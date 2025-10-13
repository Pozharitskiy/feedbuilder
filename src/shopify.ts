import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import express from "express";

export const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "").split(","),
    apiVersion: ApiVersion.October22 as any,
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  webhooks: {
    path: "/webhooks",
  },
  appUrl: process.env.APP_URL!,
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
