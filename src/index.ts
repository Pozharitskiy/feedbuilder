import "dotenv/config";
import express from "express";
import { shopify, ensureInstalled, sessionStorage } from "./shopify.js";
import { authRoutes } from "./routes/auth.js";
import { feedRoutes } from "./routes/feed.js";
import { webhookRoutes } from "./routes/webhooks.js";
import billingRoutes from "./routes/billing.js";
import { feedUpdater } from "./services/feedUpdater.js";
import { feedCacheStorage } from "./db.js";
import { initBillingDb, billingService } from "./services/billingService.js";

const app = express();
app.use(express.json());

// Initialize billing database
initBillingDb();

app.use(shopify.cspHeaders());
app.use("/install", ensureInstalled());

authRoutes(app);
feedRoutes(app);
webhookRoutes(app);
app.use("/billing", billingRoutes);

// Health check endpoint (для Fly.io и мониторинга)
app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// Status endpoint (детальная информация)
app.get("/status", (req, res) => {
  try {
    // Get revenue stats from billing service (uses subscriptions table)
    const revenueStats = billingService.getRevenueStats();

    res.json({
      status: "ok",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: Date.now(),
      revenue: {
        mrr: revenueStats.mrr,
        arr: revenueStats.arr,
        subscriptions: revenueStats.totalSubscriptions,
        byPlan: revenueStats.byPlan,
      },
    });
  } catch (error) {
    console.error("Error getting status:", error);
    res.json({
      status: "ok",
      version: "1.0.0",
      uptime: process.uptime(),
      error: (error as any).message,
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ FeedBuilderly backend is running");
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ FeedBuilderly running on port ${port}`);
  console.log(`   App URL: ${process.env.APP_URL}`);
  console.log(`   Port: ${port}`);

  // Запускаем фоновые задачи
  feedUpdater.start();
});
