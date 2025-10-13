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

app.get("/", (req, res) => {
  res.send("✅ FeedBuilder backend is running");
});

// Экспорт для Vercel serverless
export default app;

const port = Number(process.env.PORT) || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ FeedBuilder running on port ${port}`);
});
