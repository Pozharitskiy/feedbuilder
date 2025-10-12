import type { Request, Response } from "express";
import { getShopByFeedToken, loadProductsCache } from "../db.js";
import { buildXmlFeed, flattenProducts } from "../feeds.js";

export const feedRoutes = (app: any) => {
  app.get("/feed/:token.xml", async (req: Request, res: Response) => {
    const token = req.params.token;
    const shop = getShopByFeedToken(token) as any;
    if (!shop) return res.status(404).send("Invalid token");

    const cache = loadProductsCache(shop.shop_domain);
    if (!cache) return res.status(503).send("Feed not ready");

    const products = flattenProducts(cache);
    const xml = buildXmlFeed(shop.shop_domain, products);
    res.type("application/xml").send(xml);
  });
};

