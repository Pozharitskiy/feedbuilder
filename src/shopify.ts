import "dotenv/config";
import { shopifyApp } from "@shopify/shopify-app-express";
import { ApiVersion } from "@shopify/shopify-api";
import express from "express";

const appUrl = process.env.APP_URL!;
const hostName = new URL(appUrl).hostname;

export const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SCOPES || "").split(","),
    hostName,
    apiVersion: ApiVersion.October25 as any,
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
  router.get("/", async (req, res) => {
    const { shop } = req.query as any;
    if (!shop) return res.status(400).send("Missing shop param");
    return await (shopify.auth.begin as any)({ req, res });
  });
  return router;
}
