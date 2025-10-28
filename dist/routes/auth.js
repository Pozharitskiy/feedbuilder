import { shopify, sessionStorage } from "../shopify.js";
export const authRoutes = (app) => {
    // Используем middleware напрямую
    app.get("/auth", shopify.auth.begin());
    // Debug: Log all /auth/* requests
    app.use("/auth", (req, res, next) => {
        console.log(`🔵 /auth route hit: ${req.method} ${req.path}`);
        next();
    });
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
    // Auth callback
    console.log("📍 Registering /auth/callback route");
    app.get("/auth/callback", shopify.auth.callback(), async (req, res) => {
        console.error("🚨🚨🚨 /auth/callback HIT! Query:", req.query);
        console.log("🚨🚨🚨 /auth/callback HIT! Query:", req.query);
        try {
            // Let shopify middleware handle the session creation
            // It should populate res.locals.shopify.session
            let session = res.locals?.shopify?.session;
            console.error("Session from res.locals:", session ? "YES" : "NO");
            console.log("Session from res.locals:", session ? "YES" : "NO");
            if (!session) {
                console.error("❌ NO SESSION IN res.locals!");
                console.error("   res.locals keys:", Object.keys(res.locals || {}));
                return res.status(500).send("No session in res.locals");
            }
            console.error("✅ Session found! Saving...", session.id);
            const success = await sessionStorage.storeSession(session);
            console.error("Save result:", success);
            if (!success) {
                console.error("❌ Failed to save session");
                return res.status(500).send("Failed to save session");
            }
            console.error("✅ Session saved! Redirecting...");
            res.redirect(`https://${session.shop}/admin/apps`);
        }
        catch (error) {
            console.error("❌ Auth callback error:", error);
            res.status(500).send(String(error));
        }
    });
};
