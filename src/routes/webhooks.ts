import type { Request, Response } from "express";
import { shopify } from "../shopify.js";
// import { getShop, saveProductsCache } from "../db.js";
import { PRODUCTS_QUERY } from "../queries.js";

// async function refreshProducts(shop_domain: string) {
//   const shop = (await getShop(shop_domain)) as any;
//   if (!shop) return;
//   const client = new shopify.api.clients.Graphql({
//     session: { shop: shop_domain, accessToken: shop.access_token } as any,
//   });

//   let cursor: string | null = null;
//   let allEdges: any[] = [];
//   do {
//     const resp: any = await client.query({
//       data: { query: PRODUCTS_QUERY, variables: { cursor } },
//     });
//     const chunk = resp.body.data.products;
//     allEdges = allEdges.concat(chunk.edges);
//     cursor = chunk.pageInfo.hasNextPage ? chunk.pageInfo.endCursor : null;
//   } while (cursor);

//   await saveProductsCache(shop_domain, { edges: allEdges });
// }

export const webhookRoutes = (app: any) => {
  // // Генерация по расписанию можно вынести в cron (node-cron) — тут упрощённо
  // app.post("/webhooks/products/update", async (req: Request, res: Response) => {
  //   const shop = req.header("X-Shopify-Shop-Domain");
  //   if (!shop) return res.sendStatus(200);
  //   await refreshProducts(shop);
  //   res.sendStatus(200);
  // });

  // // Вспомогательный роут обновления вручную
  // app.post("/admin/regenerate", async (req: Request, res: Response) => {
  //   const { shop } = req.query as any;
  //   if (!shop) return res.status(400).send("missing shop");
  //   await refreshProducts(shop);
  //   res.send("ok");
  // });

  // // Получить URL фида для магазина
  // app.get("/admin/feed-url", async (req: Request, res: Response) => {
  //   const { shop } = req.query as any;
  //   if (!shop) return res.status(400).send("missing shop");
  //   const shopData = (await getShop(shop)) as any;
  //   if (!shopData) return res.status(404).send("shop not found");
  //   const feedUrl = `${process.env.APP_URL}/feed/${shopData.feed_token}.xml`;
  //   res.json({ feed_url: feedUrl, feed_token: shopData.feed_token });
  // });

  app.post("/webhooks", (req: Request, res: Response) => {
    console.log("Webhook:", req.body);
    res.status(200).send("ok");
  });
};
