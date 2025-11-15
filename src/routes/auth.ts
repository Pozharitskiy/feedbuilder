import type { Request, Response } from "express";
import { shopify, sessionStorage } from "../shopify.js";

export const authRoutes = (app: any) => {
  // Используем middleware напрямую
  app.get("/auth", shopify.auth.begin());

  // Debug: Log all /auth/* requests
  app.use("/auth", (req: Request, res: Response, next: any) => {
    console.log(`🔵 /auth route hit: ${req.method} ${req.path}`);
    next();
  });

  // Endpoint для удаления сессии и регенерации токена
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

  // Auth callback - now handles offline sessions
  console.log("📍 Registering /auth/callback route");
  app.get(
    "/auth/callback",
    shopify.auth.callback(),
    async (req: Request, res: Response) => {
      console.log("🚨 /auth/callback HIT! Query:", req.query);
      
      try {
        // Shopify middleware populates res.locals.shopify.session
        let session = (res as any).locals?.shopify?.session;
        
        console.log("Session from res.locals:", session ? "YES" : "NO");
        
        if (!session) {
          console.error("❌ NO SESSION IN res.locals!");
          console.error("   res.locals keys:", Object.keys((res as any).locals || {}));
          return res.status(500).send("No session in res.locals");
        }

        console.log(`✅ Session found! ID: ${session.id}, Shop: ${session.shop}, isOnline: ${session.isOnline}`);
        
        // Verify this is an offline session (needed for billing)
        if (session.isOnline) {
          console.warn("⚠️ Received online session, but useOnlineTokens=false should give offline");
        }
        
        const success = await sessionStorage.storeSession(session);
        console.log("Save result:", success);
        
        if (!success) {
          console.error("❌ Failed to save session");
          return res.status(500).send("Failed to save session");
        }

        console.log("✅ Session saved successfully! Redirecting to Shopify admin...");
        res.redirect(`https://${session.shop}/admin/apps`);
      } catch (error) {
        console.error("❌ Auth callback error:", error);
        res.status(500).send(String(error));
      }
    }
  );
};
