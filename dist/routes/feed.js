import { getShopByFeedToken, loadProductsCache } from "../db.js";
import { buildXmlFeed, flattenProducts } from "../feeds.js";
export const feedRoutes = (app) => {
    app.get("/feed/:token.xml", async (req, res) => {
        const token = req.params.token;
        const shop = await getShopByFeedToken(token);
        if (!shop)
            return res.status(404).send("Invalid token");
        const cache = await loadProductsCache(shop.shop_domain);
        if (!cache)
            return res.status(503).send("Feed not ready");
        const products = flattenProducts(cache);
        const xml = buildXmlFeed(shop.shop_domain, products);
        res.type("application/xml").send(xml);
    });
};
