import { shopify } from "../shopify.js";
export const authRoutes = (app) => {
    // Используем middleware напрямую
    app.get("/auth", shopify.auth.begin());
    app.get("/auth/callback", shopify.auth.callback(), async (req, res) => {
        console.log("✅ Auth callback completed");
        // После того как middleware отработал, сессия доступна в res.locals
        const session = res.locals?.shopify?.session;
        if (!session) {
            console.error("❌ No session found after callback");
            return res.status(500).send("No session found");
        }
        const shopDomain = session.shop;
        const accessToken = session.accessToken;
        console.log("✅ Authorized:", shopDomain, accessToken ? "Token OK" : "No token");
        res.redirect(`https://${shopDomain}/admin/apps`);
    });
};
