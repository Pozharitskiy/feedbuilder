import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/lib/services/billingService";
import { PLANS, type PlanName } from "@/lib/types/billing";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get("shop");
    const planName = searchParams.get("plan") as PlanName;
    const chargeId = searchParams.get("charge_id");

    if (!shop || !planName || !chargeId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Activate subscription
    await billingService.activateSubscription(shop, planName, chargeId);

    const plan = PLANS[planName];

    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Activated!</title>
</head>
<body style="font-family: system-ui; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0;">
  <div style="background: white; border-radius: 16px; padding: 48px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px;">
    <h1 style="color: #10b981; font-size: 48px; margin: 0 0 16px 0;">🎉</h1>
    <h2 style="color: #1f2937; margin: 0 0 24px 0;">Subscription Activated!</h2>
    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 32px;">
      Your <strong>${plan.displayName}</strong> plan is now active with a 14-day free trial.
      <br><br>
      You can now access all ${plan.formats === "all" ? "22+" : "3"} feed formats!
    </p>
    <a 
      href="https://${shop}/admin/apps" 
      style="display: inline-block; padding: 14px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; transition: all 0.3s;"
    >
      Go to Shopify Admin
    </a>
  </div>
</body>
</html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("❌ Error activating subscription:", error);
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}
