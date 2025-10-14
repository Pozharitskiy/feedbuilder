import { shopify } from "../shopify.js";
import { upsertShop } from "../db.js";
export const authRoutes = (app) => {
    app.get("/auth", async (req, res) => {
        console.log("auth", req.query);
        const redirect = await shopify.auth.begin({ req, res });
        console.log("Redirect sent to Shopify");
        return redirect;
    });
    app.get("/auth/callback", async (req, res) => {
        console.log("auth/callback hit", req.query);
        const session = await shopify.auth.callback({ req, res });
        if (!session) {
            console.error("OAuth callback failed, no session.");
            return res.status(400).send("OAuth failed.");
        }
        const shopDomain = session.shop;
        const accessToken = session.accessToken;
        await upsertShop(shopDomain, accessToken);
        console.log("✅ Authorized:", shopDomain);
        res.redirect(`https://${shopDomain}/admin/apps`);
    });
};
