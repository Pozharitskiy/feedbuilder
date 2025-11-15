// Billing service for Shopify subscriptions
import { shopify, sessionStorage } from "../shopify.js";
import type { PlanName, Subscription } from "../types/billing.js";
import { PLANS } from "../types/billing.js";
import { Session } from "@shopify/shopify-api";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use persistent data directory if mounted, otherwise fallback to project root
const dataDir = process.env.DATA_DIR || path.join(__dirname, "../..");
const dbPath = path.join(dataDir, "feedbuilder.db");
const db = new Database(dbPath);

// Initialize subscriptions table
export function initBillingDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      shop TEXT PRIMARY KEY,
      plan_name TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      charge_id TEXT,
      activated_at INTEGER NOT NULL,
      expires_at INTEGER,
      trial_ends_at INTEGER
    )
  `);
  console.log("✅ Billing database initialized");
}

class BillingService {
  // Get current subscription for shop
  getSubscription(shop: string): Subscription | null {
    const row = db
      .prepare(
        `
      SELECT * FROM subscriptions WHERE shop = ?
    `
      )
      .get(shop) as any;

    if (!row) {
      // Create default free subscription
      return this.createFreeSubscription(shop);
    }

    return {
      shop: row.shop,
      planName: row.plan_name as PlanName,
      status: row.status,
      chargeId: row.charge_id,
      activatedAt: new Date(row.activated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : undefined,
    };
  }

  // Create free subscription for new shop
  createFreeSubscription(shop: string): Subscription {
    const now = Date.now();
    db.prepare(
      `
      INSERT OR REPLACE INTO subscriptions (shop, plan_name, status, activated_at)
      VALUES (?, 'free', 'active', ?)
    `
    ).run(shop, now);

    return {
      shop,
      planName: "free",
      status: "active",
      activatedAt: new Date(now),
    };
  }

  // Create Shopify recurring charge (REAL IMPLEMENTATION - REST API)
  async createCharge(
    shop: string,
    planName: PlanName
  ): Promise<{ confirmationUrl: string; chargeId: string }> {
    const plan = PLANS[planName];
    if (!plan || plan.price === 0) {
      throw new Error("Cannot create charge for free plan");
    }

    // Mock mode for development - bypass REST API which is deprecated
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `🎭 MOCK MODE: Generating test confirmation URL for ${planName}`
      );
      const mockChargeId = `gid://shopify/AppSubscription/mock-${Date.now()}`;
      const mockConfirmationUrl = `https://admin.shopify.com/store/${shop.replace(
        ".myshopify.com",
        ""
      )}/billing/${mockChargeId}/AppSubscriptionLineItem/${mockChargeId}`;

      return {
        confirmationUrl: mockConfirmationUrl,
        chargeId: mockChargeId,
      };
    }

    try {
      // Load OFFLINE session (shop token) - required for billing
      // Must load from Shopify's sessionStorage (in shopify.ts), not from our custom db.ts
      console.log(`🔍 Billing: Looking for offline session: offline_${shop}`);
      let session = await sessionStorage.loadSession(`offline_${shop}`);

      if (!session) {
        console.error("❌ No offline session found for:", `offline_${shop}`);
        console.error("   This means the app was not installed properly or session was lost.");
        console.error("   The shop owner needs to reinstall the app to get offline access token.");
        throw new Error(
          "Shop session not found. Please reinstall the app to enable billing."
        );
      }

      console.log("📦 Session loaded for billing:", {
        shop: session.shop,
        sessionId: session.id,
        isOnline: session.isOnline,
        hasAccessToken: !!session.accessToken,
        tokenLength: session.accessToken?.length,
        tokenPreview: session.accessToken?.substring(0, 10) + "...",
      });

      if (!session.accessToken) {
        console.error("❌ Session found but accessToken is empty:", session);
        throw new Error("Session has no access token");
      }

      console.log(
        `✅ Loaded session for ${shop}, token length: ${session.accessToken.length}`
      );

      // TODO: Use GraphQL Billing API instead of REST (REST is deprecated)
      // This is for future production implementation
      const url = `https://${shop}/admin/api/2025-10/recurring_application_charges.json`;

      console.log("📡 Sending REST API request:", {
        url,
        tokenLength: session.accessToken.length,
        method: "POST",
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        } as Record<string, string>,
        body: JSON.stringify({
          recurring_application_charge: {
            name: `FeedBuilderly ${plan.displayName} Plan`,
            price: plan.price,
            return_url: `https://${process.env.HOST}/billing/callback?shop=${shop}&plan=${planName}`,
            test: process.env.NODE_ENV !== "production",
            trial_days: 14,
          },
        }),
      });

      // Try to parse response body as JSON
      let data: any = null;
      const contentType = response.headers.get("content-type");

      try {
        // Only attempt to parse as JSON if response has content and correct content type
        const text = await response.text();
        if (text && contentType?.includes("application/json")) {
          data = JSON.parse(text);
        } else if (!text) {
          console.warn("⚠️ Response body is empty");
        } else {
          console.warn("⚠️ Response is not JSON:", contentType);
        }
      } catch (parseError: any) {
        console.error("⚠️ Failed to parse response JSON:", parseError.message);
        data = null;
      }

      if (!response.ok) {
        console.error("❌ Shopify REST API error:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(
          `Shopify API error (${response.status}): ${
            data?.errors?.toString() || response.statusText
          }`
        );
      }

      if (!data?.recurring_application_charge) {
        console.error("❌ Invalid response from Shopify:", data);
        throw new Error(
          `Invalid response from Shopify: ${
            JSON.stringify(data) || "empty body"
          }`
        );
      }

      const charge = data.recurring_application_charge;

      console.log(
        `✅ Created subscription for ${shop}: ${charge.id} — waiting for confirmation`
      );

      return {
        confirmationUrl: charge.confirmation_url,
        chargeId: charge.id.toString(),
      };
    } catch (error: any) {
      console.error("❌ Error creating Shopify subscription:", error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  // Activate subscription after payment
  activateSubscription(shop: string, planName: PlanName, chargeId: string) {
    const now = Date.now();
    const trialEndsAt = now + 14 * 24 * 60 * 60 * 1000; // 14 days trial

    db.prepare(
      `
      INSERT OR REPLACE INTO subscriptions
      (shop, plan_name, status, charge_id, activated_at, trial_ends_at)
      VALUES (?, ?, 'active', ?, ?, ?)
    `
    ).run(shop, planName, chargeId, now, trialEndsAt);

    console.log(
      `✅ Activated ${planName} subscription for ${shop} (14-day trial)`
    );
  }

  // Cancel subscription
  cancelSubscription(shop: string) {
    db.prepare(
      `
      UPDATE subscriptions SET status = 'cancelled' WHERE shop = ?
    `
    ).run(shop);

    console.log(`❌ Cancelled subscription for ${shop}`);
  }

  // Check if subscription is valid
  isSubscriptionActive(shop: string): boolean {
    const subscription = this.getSubscription(shop);
    if (!subscription) return false;

    return subscription.status === "active" || subscription.status === "trial";
  }

  // Get all shops with active subscriptions
  getSubscribedShops(): string[] {
    const rows = db
      .prepare(
        `
      SELECT DISTINCT shop FROM subscriptions WHERE status IN ('active', 'trial')
    `
      )
      .all() as any[];

    return rows.map((row) => row.shop);
  }

  // Get all active subscriptions (for stats)
  getActiveSubscriptions(): Subscription[] {
    const rows = db
      .prepare(
        `
      SELECT * FROM subscriptions WHERE status IN ('active', 'trial')
    `
      )
      .all() as any[];

    return rows.map((row) => ({
      shop: row.shop,
      planName: row.plan_name as PlanName,
      status: row.status,
      chargeId: row.charge_id,
      activatedAt: new Date(row.activated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : undefined,
    }));
  }

  // Get revenue stats
  getRevenueStats() {
    const subscriptions = this.getActiveSubscriptions();
    const byPlan = {
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };

    subscriptions.forEach((sub) => {
      byPlan[sub.planName]++;
    });

    const mrr =
      byPlan.basic * PLANS.basic.price +
      byPlan.pro * PLANS.pro.price +
      byPlan.enterprise * PLANS.enterprise.price;

    return {
      totalSubscriptions: subscriptions.length,
      byPlan,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
    };
  }
}

export const billingService = new BillingService();
