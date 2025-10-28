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
import { repairDatabase } from "./db.js";

const app = express();
app.use(express.json());

// Log ALL requests to see where things are going
app.use((req: any, res: any, next: any) => {
  console.error(`📍 REQUEST: ${req.method} ${req.path} ${req.url}`);
  if (req.query && Object.keys(req.query).length > 0) {
    console.error(`   Query: ${JSON.stringify(req.query)}`);
  }
  
  // Log responses
  const originalSend = res.send;
  res.send = function(data: any) {
    console.error(`📤 RESPONSE: ${res.statusCode} ${req.method} ${req.path}`);
    if (res.statusCode >= 300 && res.statusCode < 400) {
      console.error(`   📍 Redirect to: ${res.getHeader("Location")}`);
    }
    return originalSend.call(this, data);
  };
  
  const originalRedirect = res.redirect;
  res.redirect = function(url: string) {
    console.error(`🔴 REDIRECT: ${req.method} ${req.path} -> ${url}`);
    return originalRedirect.call(this, url);
  };
  
  next();
});

// Initialize billing database
initBillingDb();

// Repair database from corrupted data
repairDatabase();

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
