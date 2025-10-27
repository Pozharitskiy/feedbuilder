// Billing routes for subscription management
import { Router } from "express";
import { billingService } from "../services/billingService.js";
import { PLANS, type PlanName } from "../types/billing.js";

const router = Router();

// Get pricing page (HTML)
router.get("/pricing", (req, res) => {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  const currentSubscription = billingService.getSubscription(shop);
  if (!currentSubscription) {
    return res.status(400).send("Failed to get subscription");
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeedBuilderly - Choose Your Plan</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      text-align: center;
      color: white;
      font-size: 42px;
      margin-bottom: 16px;
    }
    .subtitle {
      text-align: center;
      color: rgba(255,255,255,0.9);
      font-size: 18px;
      margin-bottom: 50px;
    }
    .current-plan {
      text-align: center;
      background: rgba(255,255,255,0.2);
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      margin-bottom: 40px;
      display: inline-block;
      width: 100%;
    }
    .plans {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    .plan {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s, box-shadow 0.3s;
      position: relative;
      overflow: hidden;
    }
    .plan:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    .plan.recommended {
      border: 3px solid #667eea;
    }
    .plan.recommended::before {
      content: 'MOST POPULAR';
      position: absolute;
      top: 16px;
      right: -32px;
      background: #667eea;
      color: white;
      padding: 4px 40px;
      font-size: 12px;
      font-weight: bold;
      transform: rotate(45deg);
    }
    .plan.current {
      border: 3px solid #10b981;
    }
    .plan-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .plan-price {
      font-size: 42px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 8px;
    }
    .plan-price span {
      font-size: 18px;
      color: #6b7280;
    }
    .plan-description {
      color: #6b7280;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .plan-features {
      list-style: none;
      margin-bottom: 24px;
    }
    .plan-features li {
      padding: 8px 0;
      color: #374151;
      font-size: 14px;
    }
    .plan-button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      display: block;
      text-align: center;
    }
    .plan-button.primary {
      background: #667eea;
      color: white;
    }
    .plan-button.primary:hover {
      background: #5568d3;
    }
    .plan-button.secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .plan-button.secondary:hover {
      background: #d1d5db;
    }
    .plan-button.current {
      background: #10b981;
      color: white;
      cursor: default;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-top: 60px;
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
    }
    .feature {
      color: white;
      text-align: center;
    }
    .feature-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .feature-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .feature-desc {
      font-size: 14px;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 FeedBuilderly</h1>
    <p class="subtitle">Multi-channel feed generation for Shopify stores</p>

    <div class="current-plan">
      Current Plan: <strong>${
        PLANS[currentSubscription.planName].displayName
      }</strong>
    </div>

    <div class="plans">
      ${Object.entries(PLANS)
        .map(([key, plan]) => {
          const isCurrent = currentSubscription.planName === key;
          const isRecommended = key === "pro";
          return `
          <div class="plan ${isRecommended ? "recommended" : ""} ${
            isCurrent ? "current" : ""
          }">
            <div class="plan-name">${plan.displayName}</div>
            <div class="plan-price">
              $${plan.price}
              <span>/month</span>
            </div>
            <div class="plan-description">
              ${
                plan.maxProducts === 0
                  ? "Unlimited"
                  : `Up to ${plan.maxProducts}`
              } products
            </div>
            <ul class="plan-features">
              ${plan.features.map((f) => `<li>${f}</li>`).join("")}
            </ul>
            ${
              isCurrent
                ? '<button class="plan-button current">Current Plan</button>'
                : plan.price === 0
                ? '<a href="/billing/select?shop=${shop}&plan=${key}" class="plan-button secondary">Downgrade</a>'
                : '<a href="/billing/select?shop=${shop}&plan=${key}" class="plan-button primary">Choose Plan</a>'
            }
          </div>
        `;
        })
        .join("")}
    </div>

    <div class="features-grid">
      <div class="feature">
        <div class="feature-icon">🌍</div>
        <div class="feature-title">22+ Formats</div>
        <div class="feature-desc">Support for major EU & global platforms</div>
      </div>
      <div class="feature">
        <div class="feature-icon">⚡</div>
        <div class="feature-title">Auto Updates</div>
        <div class="feature-desc">Feeds update automatically via cron & webhooks</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🔒</div>
        <div class="feature-title">Secure & Reliable</div>
        <div class="feature-desc">SQLite caching, deployed on Fly.io</div>
      </div>
      <div class="feature">
        <div class="feature-icon">📊</div>
        <div class="feature-title">Analytics</div>
        <div class="feature-desc">Track feed performance & cache stats</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  res.send(html);
});

// Select plan and initiate charge
router.get("/select", async (req, res) => {
  try {
    const shop = req.query.shop as string;
    const planName = req.query.plan as PlanName;

    if (!shop || !planName) {
      return res.status(400).send("Missing shop or plan parameter");
    }

    if (!PLANS[planName]) {
      return res.status(400).send("Invalid plan");
    }

    // If free plan, just activate
    if (planName === "free") {
      billingService.createFreeSubscription(shop);
      return res.redirect(`/pricing?shop=${shop}`);
    }

    // Create Shopify charge
    const { confirmationUrl } = await billingService.createCharge(
      shop,
      planName
    );

    // Redirect to Shopify payment
    res.redirect(confirmationUrl);
  } catch (error: any) {
    console.error("❌ Error creating charge:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Callback after payment
router.get("/callback", async (req, res) => {
  try {
    const shop = req.query.shop as string;
    const planName = req.query.plan as PlanName;
    const chargeId = req.query.charge_id as string;

    if (!shop || !planName || !chargeId) {
      return res.status(400).send("Missing required parameters");
    }

    // Activate subscription
    billingService.activateSubscription(shop, planName, chargeId);

    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Activated!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    h1 { color: #10b981; font-size: 48px; margin: 0 0 16px 0; }
    h2 { color: #1f2937; margin: 0 0 24px 0; }
    p { color: #6b7280; line-height: 1.6; margin-bottom: 32px; }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      transition: all 0.3s;
    }
    .button:hover { background: #5568d3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎉</h1>
    <h2>Subscription Activated!</h2>
    <p>
      Your <strong>${
        PLANS[planName].displayName
      }</strong> plan is now active with a 14-day free trial.
      <br><br>
      You can now access all ${
        PLANS[planName].formats === "all" ? "22+" : "3"
      } feed formats!
    </p>
    <a href="https://${shop}/admin/apps" class="button">Go to Shopify Admin</a>
  </div>
</body>
</html>
    `);
  } catch (error: any) {
    console.error("❌ Error activating subscription:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Get current subscription (API)
router.get("/subscription", (req, res) => {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).json({ error: "Missing shop parameter" });
  }

  const subscription = billingService.getSubscription(shop);
  if (!subscription) {
    return res.status(404).json({ error: "Subscription not found" });
  }

  const plan = PLANS[subscription.planName];

  res.json({
    subscription,
    plan,
  });
});

// Get revenue stats (internal API)
router.get("/stats", (req, res) => {
  const stats = billingService.getRevenueStats();
  res.json(stats);
});

export default router;
