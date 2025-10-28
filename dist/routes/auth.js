import { shopify, sessionStorage } from "../shopify.js";
export const authRoutes = (app) => {
    // Используем middleware напрямую
    app.get("/auth", shopify.auth.begin());
    // Endpoint для удаления сессии и регенерации токена
    app.get("/auth/logout", async (req, res) => {
        const shop = req.query.shop;
        if (!shop) {
            return res.status(400).send("Missing shop parameter");
        }
        try {
            // Delete both offline and online sessions
            await sessionStorage.deleteSession(`offline_${shop}`);
            await sessionStorage.deleteSession(`online_${shop}`);
            console.log(`✅ Deleted sessions for ${shop}`);
            res.send(`Sessions deleted for ${shop}. <a href="/install?shop=${shop}">Reinstall app</a>`);
        }
        catch (error) {
            console.error("❌ Failed to delete sessions:", error);
            res.status(500).send(`Error: ${error}`);
        }
    });
    app.get("/auth/callback", shopify.auth.callback(), async (req, res) => {
        console.log("✅ Auth callback received");
        console.log("📦 Callback request:", {
            path: req.path,
            query: req.query,
        });
        // После того как middleware отработал, сессия доступна в res.locals
        const session = res.locals?.shopify?.session;
        if (!session) {
            console.error("❌ No session found after callback middleware");
            console.error("📦 res.locals:", res.locals);
            return res.status(500).send("No session found after OAuth");
        }
        const shopDomain = session.shop;
        const accessToken = session.accessToken;
        const expectedScopes = (process.env.SCOPES || "read_products").split(",");
        const receivedScopes = (session.scope || "").split(",").filter(Boolean);
        // Логирование для отладки
        console.log("📦 New session from OAuth:", {
            shop: shopDomain,
            tokenLength: accessToken?.length,
            tokenPreview: accessToken?.substring(0, 10) + "...",
            receivedScopes: receivedScopes,
            expectedScopes: expectedScopes,
            scopesMatch: JSON.stringify(receivedScopes.sort()) ===
                JSON.stringify(expectedScopes.sort()),
        });
        // Session уже сохранена middleware, но логируем для подтверждения
        try {
            // Verify session was saved
            const savedSession = await sessionStorage.loadSession(`offline_${shopDomain}`);
            if (savedSession) {
                console.log(`✅ Session confirmed saved for ${shopDomain}`, {
                    tokenLength: savedSession.accessToken?.length,
                });
            }
            else {
                console.warn(`⚠️ Session not found after save for ${shopDomain}`);
            }
        }
        catch (error) {
            console.error("❌ Failed to verify session:", error);
        }
        console.log(`✅ Auth completed for ${shopDomain}, redirecting...`);
        res.redirect(`https://${shopDomain}/admin/apps`);
    });
};
