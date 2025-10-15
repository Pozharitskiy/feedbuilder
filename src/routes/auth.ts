import type { Request, Response } from "express";
import { shopify } from "../shopify.js";
import { sessionStorage } from "../db.js";

export const authRoutes = (app: any) => {
  // Используем middleware напрямую
  app.get("/auth", shopify.auth.begin());

  app.get(
    "/auth/callback",
    shopify.auth.callback(),
    async (req: Request, res: Response) => {
      console.log("✅ Auth callback completed");

      // После того как middleware отработал, сессия доступна в res.locals
      const session = (res as any).locals?.shopify?.session;

      if (!session) {
        console.error("❌ No session found after callback");
        return res.status(500).send("No session found");
      }

      const shopDomain = session.shop;
      const accessToken = session.accessToken;

      // Сохраняем в нашу БД для быстрого доступа
      try {
        sessionStorage.saveSession({
          id: session.id,
          shop: shopDomain,
          accessToken: accessToken,
          scopes: session.scope || "",
          isOnline: session.isOnline || false,
          expiresAt: session.expires
            ? new Date(session.expires).getTime()
            : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        console.log(
          "✅ Shop authorized and saved:",
          shopDomain,
          "| Scopes:",
          session.scope
        );
      } catch (error) {
        console.error("❌ Failed to save session:", error);
      }

      res.redirect(`https://${shopDomain}/admin/apps`);
    }
  );
};
