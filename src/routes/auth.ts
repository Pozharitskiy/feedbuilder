import type { Request, Response } from "express";
import { shopify } from "../shopify.js";
import { sessionStorage } from "../db.js";

export const authRoutes = (app: any) => {
  // Используем middleware напрямую
  app.get("/auth", shopify.auth.begin());

  // Endpoint для удаления сессии (для отладки)
  app.get("/auth/logout", async (req: Request, res: Response) => {
    const shop = req.query.shop as string;
    if (!shop) {
      return res.status(400).send("Missing shop parameter");
    }

    try {
      // Delete both offline and online sessions
      await sessionStorage.deleteSession(`offline_${shop}`);
      await sessionStorage.deleteSession(`online_${shop}`);
      console.log(`✅ Deleted sessions for ${shop}`);
      res.send(
        `Sessions deleted for ${shop}. <a href="/install?shop=${shop}">Reinstall app</a>`
      );
    } catch (error) {
      console.error("❌ Failed to delete sessions:", error);
      res.status(500).send(`Error: ${error}`);
    }
  });

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

      // Логирование для отладки
      console.log("📦 New session from OAuth:", {
        shop: shopDomain,
        tokenLength: accessToken?.length,
        tokenPreview: accessToken?.substring(0, 10) + "...",
        scopes: session.scope,
      });

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
