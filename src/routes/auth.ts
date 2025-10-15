import type { Request, Response } from "express";
import { shopify } from "../shopify.js";

export const authRoutes = (app: any) => {
  app.get("/auth", (req: Request, res: Response) => {
    console.log(
      "auth",
      req.query,
      process.env.SHOPIFY_API_KEY,
      process.env.SHOPIFY_API_SECRET?.length,
      process.env.API_URL
    );
    return (shopify.auth.begin as any)({ req, res });
  });

  app.get("/auth/callback", async (req: Request, res: Response) => {
    console.log("auth/callback", req.query);
    try {
      const session = await (shopify.auth.callback as any)({ req, res });
      const shopDomain = session.shop;
      const accessToken = session.accessToken;
      console.log(
        "✅ Authorized:",
        shopDomain,
        accessToken ? "Token OK" : "No token"
      );
      res.redirect(`https://${shopDomain}/admin/apps`);
    } catch (e) {
      console.error("❌ OAuth callback failed:", e);
      res.status(500).send("OAuth failed.");
    }
  });
};
