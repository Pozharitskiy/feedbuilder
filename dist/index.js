import "dotenv/config";
import express from "express";
import { shopify, ensureInstalled, sessionStorage } from "./shopify.js";
import { authRoutes } from "./routes/auth.js";
import { feedRoutes } from "./routes/feed.js";
import { webhookRoutes } from "./routes/webhooks.js";
import billingRoutes from "./routes/billing.js";
import { feedUpdater } from "./services/feedUpdater.js";
import { initDatabase } from "./db.js";
import { initBillingDb, billingService } from "./services/billingService.js";
const app = express();
app.use(express.json());
// Log ALL requests to see where things are going
app.use((req, res, next) => {
    console.error(`📍 REQUEST: ${req.method} ${req.path} ${req.url}`);
    if (req.query && Object.keys(req.query).length > 0) {
        console.error(`   Query: ${JSON.stringify(req.query)}`);
    }
    // Log responses
    const originalSend = res.send;
    res.send = function (data) {
        console.error(`📤 RESPONSE: ${res.statusCode} ${req.method} ${req.path}`);
        if (res.statusCode >= 300 && res.statusCode < 400) {
            console.error(`   📍 Redirect to: ${res.getHeader("Location")}`);
        }
        return originalSend.call(this, data);
    };
    const originalRedirect = res.redirect;
    res.redirect = function (url) {
        console.error(`🔴 REDIRECT: ${req.method} ${req.path} -> ${url}`);
        return originalRedirect.call(this, url);
    };
    next();
});
// Initialize Supabase database
await initDatabase();
await initBillingDb();
app.use(shopify.cspHeaders());
// Exitiframe endpoint for embedded app OAuth
app.get("/exitiframe", async (req, res) => {
    const { shop } = req.query;
    if (!shop || typeof shop !== "string") {
        return res.status(400).send("Missing shop parameter");
    }
    // Redirect to begin OAuth outside iframe
    return res.redirect(`/auth?shop=${shop}`);
});
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
app.get("/status", async (req, res) => {
    try {
        // Get revenue stats from billing service (uses subscriptions table)
        const revenueStats = await billingService.getRevenueStats();
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
    }
    catch (error) {
        console.error("Error getting status:", error);
        res.json({
            status: "ok",
            version: "1.0.0",
            uptime: process.uptime(),
            error: error.message,
        });
    }
});
// Root endpoint - check if session exists, if not redirect to install
app.get("/", async (req, res) => {
    const shop = req.query.shop;
    // If no shop parameter, just show status
    if (!shop) {
        return res.send("✅ FeedBuilderly backend is running");
    }
    // Check if we have a session for this shop
    const offlineSession = await sessionStorage.loadSession(`offline_${shop}`);
    if (!offlineSession) {
        console.log(`⚠️ No session for ${shop}, redirecting to install...`);
        return res.redirect(`/install?shop=${shop}`);
    }
    // Session exists, show welcome page
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FeedBuilderly</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
    }
    h1 { color: #667eea; margin: 0 0 16px 0; }
    p { color: #6b7280; line-height: 1.6; margin-bottom: 32px; }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin: 8px;
      transition: all 0.3s;
    }
    .button:hover { background: #5568d3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 FeedBuilderly</h1>
    <p>Your multi-channel feed generator is ready!</p>
    <a href="/billing/pricing?shop=${shop}" class="button">Choose Plan</a>
    <a href="/feeds?shop=${shop}" class="button">View Feeds</a>
  </div>
</body>
</html>
  `);
});
const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
    console.log(`✅ FeedBuilderly running on port ${port}`);
    console.log(`   App URL: ${process.env.APP_URL}`);
    console.log(`   Port: ${port}`);
    // Запускаем фоновые задачи
    feedUpdater.start();
});
