// Billing routes for subscription management
import { Router } from "express";
import { billingService } from "../services/billingService.js";
import { PLANS, type PlanName } from "../types/billing.js";

const router = Router();

// Get pricing page (HTML)
router.get("/pricing", async (req, res) => {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  const currentSubscription = await billingService.getSubscription(shop);
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e27;
      background-image:
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.15) 0px, transparent 50%);
      min-height: 100vh;
      padding: 60px 24px;
      position: relative;
      overflow-x: hidden;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: clamp(36px, 5vw, 56px);
      font-weight: 800;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .subtitle {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 18px;
      margin-bottom: 24px;
      font-weight: 400;
    }

    .current-plan {
      text-align: center;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(12px);
      padding: 14px 28px;
      border-radius: 100px;
      color: rgba(255,255,255,0.95);
      margin: 0 auto 60px;
      display: inline-block;
      border: 1px solid rgba(255,255,255,0.1);
      font-weight: 500;
      font-size: 14px;
      letter-spacing: 0.01em;
    }

    .plans {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 28px;
      margin-bottom: 80px;
      perspective: 1000px;
    }

    .plan {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 40px 32px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .plan:hover {
      transform: translateY(-8px) scale(1.02);
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.15);
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.2);
    }

    .plan.recommended {
      background: rgba(99, 102, 241, 0.08);
      border: 2px solid rgba(99, 102, 241, 0.3);
      transform: scale(1.05);
    }

    .plan.recommended::after {
      content: 'POPULAR';
      position: absolute;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      pointer-events: none;
      z-index: 1;
    }

    .plan.current {
      border: 2px solid rgba(34, 197, 94, 0.4);
      background: rgba(34, 197, 94, 0.05);
    }

    .plan-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 12px;
      color: rgba(255,255,255,0.95);
      letter-spacing: -0.01em;
    }

    .plan-price {
      font-size: 52px;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, #c7d2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
      line-height: 1;
      letter-spacing: -0.03em;
    }

    .plan-price span {
      font-size: 18px;
      font-weight: 500;
      color: rgba(255,255,255,0.5);
    }

    .plan-description {
      color: rgba(255,255,255,0.6);
      margin-bottom: 32px;
      font-size: 15px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .plan-features {
      list-style: none;
      margin-bottom: 32px;
    }

    .plan-features li {
      padding: 10px 0;
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 400;
    }

    .plan-features li::before {
      content: '✓';
      color: #22c55e;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      background: rgba(34, 197, 94, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .plan-button {
      width: 100%;
      padding: 16px 24px;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      display: block;
      text-align: center;
      font-family: 'Inter', sans-serif;
      letter-spacing: -0.01em;
      position: relative;
      z-index: 10;
    }

    .plan-button.primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .plan-button.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6);
    }

    .plan-button.secondary {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .plan-button.secondary:hover {
      background: rgba(255,255,255,0.12);
      transform: translateY(-2px);
    }

    .plan-button.current {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      cursor: default;
      box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      margin-top: 100px;
      padding: 60px 48px;
      background: rgba(255,255,255,0.02);
      backdrop-filter: blur(12px);
      border-radius: 32px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .feature {
      text-align: center;
    }

    .feature-icon {
      font-size: 52px;
      margin-bottom: 20px;
      filter: drop-shadow(0 4px 12px rgba(99, 102, 241, 0.3));
    }

    .feature-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 12px;
      color: rgba(255,255,255,0.95);
      letter-spacing: -0.01em;
    }

    .feature-desc {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      line-height: 1.6;
      font-weight: 400;
    }

    @media (max-width: 768px) {
      .plans {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .plan.recommended {
        transform: scale(1);
      }

      .features-grid {
        padding: 40px 24px;
        margin-top: 60px;
      }
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
                ? `<a href="/billing/select?shop=${shop}&plan=${key}" class="plan-button secondary">Downgrade</a>`
                : `<a href="/billing/select?shop=${shop}&plan=${key}" class="plan-button primary">Choose Plan</a>`
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

    // Check if shop has installed the app
    // Must load offline session (needed for billing API calls)
    const { shopify, sessionStorage } = await import("../shopify.js");
    console.log(`🔍 Looking for offline session: offline_${shop}`);
    let session = await sessionStorage.loadSession(`offline_${shop}`);

    if (!session) {
      console.log(`⚠️ No offline session found for shop: ${shop}`);
      // Try online session as fallback (but billing might not work)
      session = await sessionStorage.loadSession(`online_${shop}`);
      if (session) {
        console.warn(`⚠️ Found online session for ${shop}, but offline token is required for billing`);
      }
    } else {
      console.log(`✅ Found offline session for ${shop}`);
    }

    if (!session) {
      console.error(`❌ No session found at all for shop: ${shop}`);
      return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Not Installed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e27;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 48px;
      text-align: center;
      max-width: 500px;
    }
    h1 { font-size: 48px; margin: 0 0 16px 0; }
    h2 { color: rgba(255,255,255,0.9); margin: 0 0 24px 0; }
    p { color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 32px; }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️</h1>
    <h2>App Not Installed</h2>
    <p>
      Please install FeedBuilderly on your store first.<br>
      After installation, you'll be able to choose your plan.
    </p>
    <a href="/install?shop=${shop}" class="button">Install FeedBuilderly</a>
  </div>
</body>
</html>
      `);
    }

    // If free plan, just activate
    if (planName === "free") {
      await billingService.createFreeSubscription(shop);
      return res.redirect(`/pricing?shop=${shop}`);
    }

    // Create real Shopify subscription charge
    const { confirmationUrl } = await billingService.createCharge(
      shop,
      planName
    );

    // Redirect to Shopify payment confirmation page
    // Use JavaScript redirect to work in embedded app context
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting to payment...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e27;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      color: white;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      border: 4px solid rgba(255,255,255,0.1);
      border-left-color: #6366f1;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      margin: 0;
    }
    p {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      margin: 8px 0 0 0;
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <h2>Redirecting to payment...</h2>
    <p>Please wait while we redirect you to Shopify</p>
  </div>
  <script>
    // Redirect to Shopify Admin confirmation page
    // Use window.top to break out of iframe if embedded
    window.top.location.href = "${confirmationUrl}";
  </script>
</body>
</html>
    `);
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
    await billingService.activateSubscription(shop, planName, chargeId);

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
router.get("/subscription", async (req, res) => {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).json({ error: "Missing shop parameter" });
  }

  const subscription = await billingService.getSubscription(shop);
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
router.get("/stats", async (req, res) => {
  const stats = await billingService.getRevenueStats();
  res.json(stats);
});

export default router;
