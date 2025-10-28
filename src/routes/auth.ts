import type { Request, Response } from "express";
import { shopify, sessionStorage } from "../shopify.js";

export const authRoutes = (app: any) => {
  // Используем middleware напрямую
  app.get("/auth", shopify.auth.begin());

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

  app.get(
    "/auth/callback",
    shopify.auth.callback(),
    async (req: Request, res: Response) => {
      console.log("✅ Auth callback received");
      console.log("📦 Callback request:", {
        path: req.path,
        query: req.query,
      });

      // После того как middleware отработал, сессия доступна в res.locals
      const session = (res as any).locals?.shopify?.session;

      if (!session) {
        console.error("❌ No session found after callback middleware");
        console.error("📦 res.locals:", (res as any).locals);
        return res.status(500).send("No session found after OAuth");
      }

      const shopDomain = session.shop;
      const accessToken = session.accessToken;
      const expectedScopes = (process.env.SCOPES || "read_products").split(",");
      const receivedScopes = (session.scope || "").split(",").filter(Boolean);

      // Логирование для отладки
      console.log("📦 New session from OAuth:", {
        shop: shopDomain,
        sessionId: session.id,
        tokenLength: accessToken?.length,
        tokenPreview: accessToken?.substring(0, 10) + "...",
        receivedScopes: receivedScopes,
        expectedScopes: expectedScopes,
        scopesMatch:
          JSON.stringify(receivedScopes.sort()) ===
          JSON.stringify(expectedScopes.sort()),
      });

      // Explicitly save session - middleware might not do it automatically
      try {
        // Save as offline session (for background jobs)
        const offlineSessionId = `offline_${shopDomain}`;
        await sessionStorage.storeSession(session);
        console.log(`✅ Session saved with ID: ${session.id}`);

        // Verify session was saved
        const verifySession = await sessionStorage.loadSession(session.id);
        if (verifySession) {
          console.log(`✅ Session verified in storage:`, {
            shop: verifySession.shop,
            tokenLength: verifySession.accessToken?.length,
          });
        } else {
          console.warn(
            `⚠️ Session not found after save - trying alternate load...`
          );
          // Try loading with shop-based key
          const altSession = await sessionStorage.loadSession(offlineSessionId);
          if (altSession) {
            console.log(
              `✅ Found session with alternate key: ${offlineSessionId}`
            );
          } else {
            console.error(`❌ Session not found with either key!`);
          }
        }
      } catch (error) {
        console.error("❌ Failed to save session:", error);
        return res.status(500).send(`Failed to save session: ${error}`);
      }

      console.log(`✅ Auth completed for ${shopDomain}, redirecting...`);
      res.redirect(`https://${shopDomain}/admin/apps`);
    }
  );
};
