import type { Request, Response } from "express";
import { shopify } from "../shopify.js";
import { upsertShop } from "../db.js";

export const authRoutes = (app: any) => {
  app.get("/auth", async (req: Request, res: Response) => {
    return (shopify.auth.begin as any)({ req, res });
  });

  app.get("/auth/callback", async (req: Request, res: Response) => {
    const result = await (shopify.auth.callback as any)({ req, res });
    const session = result.session;
    const shopDomain = session.shop;
    const accessToken = session.accessToken;
    const feedToken = upsertShop(shopDomain, accessToken);
    // Редирект в админку Shopify (или на страницу настроек)
    res.redirect(`https://${shopDomain}/admin/apps`);
  });
};

