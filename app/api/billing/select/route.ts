import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/lib/services/billingService";
import { sessionStorage } from "@/lib/shopify";
import { PLANS, type PlanName } from "@/lib/types/billing";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get("shop");
    const planName = searchParams.get("plan") as PlanName;

    if (!shop || !planName) {
      return NextResponse.json(
        { error: "Missing shop or plan parameter" },
        { status: 400 }
      );
    }

    if (!PLANS[planName]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Check if shop has installed the app
    console.log(`🔍 Looking for offline session: offline_${shop}`);
    let session = await sessionStorage.loadSession(`offline_${shop}`);

    if (!session) {
      console.log(`⚠️ No offline session found for shop: ${shop}`);
      session = await sessionStorage.loadSession(`online_${shop}`);
      if (session) {
        console.warn(
          `⚠️ Found online session for ${shop}, but offline token is required for billing`
        );
      }
    } else {
      console.log(`✅ Found offline session for ${shop}`);
    }

    if (!session) {
      console.error(`❌ No session found at all for shop: ${shop}`);
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Not Installed</title>
</head>
<body style="font-family: system-ui; background: #0a0e27; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0;">
  <div style="text-align: center; max-width: 500px; padding: 48px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px;">
    <h1 style="font-size: 48px; margin: 0 0 16px 0;">⚠️</h1>
    <h2 style="margin: 0 0 24px 0;">App Not Installed</h2>
    <p style="color: rgba(255,255,255,0.7); margin-bottom: 32px;">
      Please install FeedBuilderly on your store first.
    </p>
    <a href="/install?shop=${shop}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
      Install FeedBuilderly
    </a>
  </div>
</body>
</html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // If free plan, just activate
    if (planName === "free") {
      await billingService.createFreeSubscription(shop);
      return NextResponse.redirect(`/billing/pricing?shop=${shop}`);
    }

    // Create real Shopify subscription charge
    const { confirmationUrl } = await billingService.createCharge(shop, planName);

    // Redirect to Shopify payment confirmation page
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting to payment...</title>
</head>
<body style="font-family: system-ui; background: #0a0e27; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0;">
  <div style="text-align: center;">
    <div style="border: 4px solid rgba(255,255,255,0.1); border-left-color: #6366f1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
    <h2 style="font-size: 20px; margin: 0 0 8px 0;">Redirecting to payment...</h2>
    <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin: 0;">Please wait</p>
  </div>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script>
    window.top.location.href = "${confirmationUrl}";
  </script>
</body>
</html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("❌ Error creating charge:", error);
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}
