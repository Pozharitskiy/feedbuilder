import "dotenv/config";
import express from "express";
import { shopify, ensureInstalled } from "./shopify.js";
import { authRoutes } from "./routes/auth.js";
import { feedRoutes } from "./routes/feed.js";
import { webhookRoutes } from "./routes/webhooks.js";
const app = express();
app.use(express.json());
app.use(shopify.cspHeaders());
app.use("/install", ensureInstalled());
authRoutes(app);
feedRoutes(app);
webhookRoutes(app);
app.get("/", (req, res) => {
    res.send("✅ FeedBuilderly backend is running");
});
const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
    console.log(`✅ FeedBuilderly running on port ${port}`);
});
