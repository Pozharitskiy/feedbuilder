// Billing service for Shopify subscriptions
import { shopify, sessionStorage } from "../shopify.js";
import type { PlanName, Subscription } from "../types/billing.js";
import { PLANS } from "../types/billing.js";
import { supabase } from "../db.js";

// Initialize subscriptions table
export async function initBillingDb() {
  try {
    console.log("🔍 Initializing billing database...");

    // Table will be created via Supabase migration or SQL
    // Check if table exists by trying to query it
    const { error } = await supabase
      .from("subscriptions")
      .select("shop")
      .limit(1);

    if (error && error.code === "42P01") {
      // Table doesn't exist
      console.log("⚠️ Subscriptions table doesn't exist, will be created");
    } else if (error) {
      console.error("❌ Error checking subscriptions table:", error);
    } else {
      console.log("✅ Subscriptions table exists");
    }

    console.log("✅ Billing database initialized");
  } catch (error) {
    console.error("❌ Error initializing billing DB:", error);
  }
}

class BillingService {
  // Get current subscription for shop
  async getSubscription(shop: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("shop", shop)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Not found - create default free subscription
          return await this.createFreeSubscription(shop);
        }
        console.error("Error getting subscription:", error);
        return await this.createFreeSubscription(shop);
      }

      return {
        shop: data.shop,
        planName: data.plan_name as PlanName,
        status: data.status,
        chargeId: data.charge_id,
        activatedAt: new Date(data.activated_at),
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        trialEndsAt: data.trial_ends_at
          ? new Date(data.trial_ends_at)
          : undefined,
      };
    } catch (error) {
      console.error("Error in getSubscription:", error);
      return null;
    }
  }

  // Create free subscription for new shop
  async createFreeSubscription(shop: string): Promise<Subscription> {
    const now = new Date().toISOString();

    const { error } = await supabase.from("subscriptions").upsert(
      {
        shop,
        plan_name: "free",
        status: "active",
        activated_at: now,
      },
      { onConflict: "shop" }
    );

    if (error) {
      console.error("Error creating free subscription:", error);
    }

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

    // For testing: Use Shopify test charges instead of mock
    // Mock mode disabled - always use real Shopify API

    try {
      // Load OFFLINE session (shop token) - required for billing
      // Must load from Shopify's sessionStorage (in shopify.ts), not from our custom db.ts
      console.log(`🔍 Billing: Looking for offline session: offline_${shop}`);
      let session = await sessionStorage.loadSession(`offline_${shop}`);

      if (!session) {
        console.error("❌ No offline session found for:", `offline_${shop}`);
        console.error(
          "   This means the app was not installed properly or session was lost."
        );
        console.error(
          "   The shop owner needs to reinstall the app to get offline access token."
        );
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
        tokenPreview: session.accessToken?.substring(0, 15) + "...",
      });

      if (!session.accessToken) {
        console.error("❌ Session found but accessToken is empty:", session);
        throw new Error("Session has no access token");
      }

      console.log("✅ Session details:", {
        shop: session.shop,
        tokenLength: session.accessToken.length,
        tokenStartsWith: session.accessToken.substring(0, 4),
        scope: session.scope,
        isOnline: session.isOnline,
      });

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
  async activateSubscription(
    shop: string,
    planName: PlanName,
    chargeId: string
  ) {
    const now = new Date().toISOString();
    const trialEndsAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString(); // 14 days trial

    const { error } = await supabase.from("subscriptions").upsert(
      {
        shop,
        plan_name: planName,
        status: "active",
        charge_id: chargeId,
        activated_at: now,
        trial_ends_at: trialEndsAt,
      },
      { onConflict: "shop" }
    );

    if (error) {
      console.error("Error activating subscription:", error);
    } else {
      console.log(
        `✅ Activated ${planName} subscription for ${shop} (14-day trial)`
      );
    }
  }

  // Cancel subscription
  async cancelSubscription(shop: string) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("shop", shop);

    if (error) {
      console.error("Error cancelling subscription:", error);
    } else {
      console.log(`❌ Cancelled subscription for ${shop}`);
    }
  }

  // Check if subscription is valid
  async isSubscriptionActive(shop: string): Promise<boolean> {
    const subscription = await this.getSubscription(shop);
    if (!subscription) return false;

    return subscription.status === "active" || subscription.status === "trial";
  }

  // Get all shops with active subscriptions
  async getSubscribedShops(): Promise<string[]> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("shop")
      .in("status", ["active", "trial"]);

    if (error) {
      console.error("Error getting subscribed shops:", error);
      return [];
    }

    return data?.map((row) => row.shop) || [];
  }

  // Get all active subscriptions (for stats)
  async getActiveSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .in("status", ["active", "trial"]);

    if (error) {
      console.error("Error getting active subscriptions:", error);
      return [];
    }

    return (
      data?.map((row) => ({
        shop: row.shop,
        planName: row.plan_name as PlanName,
        status: row.status,
        chargeId: row.charge_id,
        activatedAt: new Date(row.activated_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        trialEndsAt: row.trial_ends_at
          ? new Date(row.trial_ends_at)
          : undefined,
      })) || []
    );
  }

  // Get revenue stats
  async getRevenueStats() {
    const subscriptions = await this.getActiveSubscriptions();
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
