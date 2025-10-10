import "dotenv/config";
import express from "express";
import { shopify, ensureInstalled } from "./shopify.js";
import { authRoutes } from "./routes/auth.js";
import { feedRoutes } from "./routes/feed.js";
import { webhookRoutes } from "./routes/webhooks.js";

const app = express();
app.use(express.json());

app.use(shopify.cspHeaders());
app.use(ensureInstalled());

authRoutes(app);
webhookRoutes(app);
feedRoutes(app);

// Для локальной разработки
if (process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`FeedBuilder running on http://localhost:${port}`);
  });
}

// Экспорт для Vercel serverless
export default app;

