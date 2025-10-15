import { shopify } from "../shopify.js";
export const authRoutes = (app) => {
    app.get("/auth", (req, res) => {
        console.log("auth", req.query);
        return shopify.auth.begin({ req, res });
    });
    app.get("/auth/callback", async (req, res) => {
        console.log("auth/callback", req.query);
        try {
            const session = await shopify.auth.callback({ req, res });
            const shopDomain = session.shop;
            const accessToken = session.accessToken;
            console.log("✅ Authorized:", shopDomain, accessToken ? "Token OK" : "No token");
            res.redirect(`https://${shopDomain}/admin/apps`);
        }
        catch (e) {
            console.error("❌ OAuth callback failed:", e);
            res.status(500).send("OAuth failed.");
        }
    });
};
