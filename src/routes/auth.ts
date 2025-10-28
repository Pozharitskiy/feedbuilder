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

  // Auth callback
  console.log("📍 Registering /auth/callback route");
  app.get(
    "/auth/callback",
    (req: Request, res: Response, next: any) => {
      console.log("🔴 BEFORE shopify.auth.callback() middleware");
      console.log("   Request query:", req.query);
      next();
    },
    shopify.auth.callback(),
    (req: Request, res: Response, next: any) => {
      console.log("🟢 AFTER shopify.auth.callback() middleware");
      console.log("   res.locals keys:", Object.keys((res as any).locals || {}));
      if ((res as any).locals?.shopify) {
        console.log("   shopify keys:", Object.keys((res as any).locals.shopify));
        if ((res as any).locals.shopify.session) {
          console.log("   ✅ Session object present in middleware");
          console.log("   Session ID:", (res as any).locals.shopify.session.id);
          console.log("   Session shop:", (res as any).locals.shopify.session.shop);
        }
      }
      next();
    },
    async (req: Request, res: Response) => {
      console.log("✅ Auth callback handler START");
      console.log("📦 Callback request:", {
        path: req.path,
        query: req.query,
      });

      // Debug - log everything in res.locals
      console.log(
        "🔍 res.locals keys:",
        Object.keys((res as any).locals || {})
      );
      console.log(
        "🔍 res.locals.shopify keys:",
        Object.keys((res as any).locals?.shopify || {})
      );

      // After middleware, session should be in res.locals.shopify.session
      let session = (res as any).locals?.shopify?.session;

      console.log(
        "📦 Session from middleware:",
        session ? "FOUND" : "NOT FOUND"
      );
      console.log("📦 Session type:", typeof session);
      if (session) {
        console.log("📦 Session ID:", session.id);
        console.log("📦 Session shop:", session.shop);
        console.log("📦 Session hasAccessToken:", !!session.accessToken);
        console.log("📦 Session scope:", session.scope);
        console.log("📦 Full session:", JSON.stringify(session, null, 2));
      }

      if (!session) {
        console.error("❌ No session found after callback middleware");
        console.error("📦 res.locals:", (res as any).locals);
        return res
          .status(500)
          .send(
            `No session found after OAuth. res.locals keys: ${Object.keys(
              (res as any).locals || {}
            ).join(", ")}`
          );
      }

      const shopDomain = session.shop;
      const accessToken = session.accessToken;

      console.log("📦 Session details:", {
        id: session.id,
        shop: shopDomain,
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length,
        scope: session.scope,
      });

      // Explicitly save session
      try {
        console.log("1️⃣ Attempting to store session...");
        console.log("   Session object to store:", session);
        const success = await sessionStorage.storeSession(session);
        console.log("2️⃣ Store result:", success);

        if (!success) {
          console.error("❌ Failed to store session!");
          return res.status(500).send("Failed to store session");
        }

        console.log(`✅ Auth completed for ${shopDomain}, redirecting...`);
        res.redirect(`https://${shopDomain}/admin/apps`);
      } catch (error) {
        console.error("❌ Error in auth callback:", error);
        return res.status(500).send(`Error: ${error}`);
      }
    }
  );
};
