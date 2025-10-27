// Billing service for Shopify subscriptions
import { sessionStorage } from "../db.js";
import { shopify } from "../shopify.js";
import type { PlanName, Subscription } from "../types/billing.js";
import { PLANS } from "../types/billing.js";
import { Session } from "@shopify/shopify-api";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../../feedbuilder.db");
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

  // Create Shopify recurring charge (REAL IMPLEMENTATION)
  async createCharge(
    shop: string,
    planName: PlanName
  ): Promise<{ confirmationUrl: string; chargeId: string }> {
    const plan = PLANS[planName];
    if (!plan || plan.price === 0) {
      throw new Error("Cannot create charge for free plan");
    }

    // Get session from database
    const dbSession = sessionStorage.getSession(shop);
    if (!dbSession) {
      throw new Error("Shop session not found");
    }

    try {
      // Create Shopify API Session object
      const session = new Session({
        id: dbSession.id,
        shop: dbSession.shop,
        state: "active",
        isOnline: dbSession.isOnline,
        accessToken: dbSession.accessToken,
        scope: dbSession.scopes,
      });

      // Create GraphQL client using shopify-app-express
      const client = new shopify.api.clients.Graphql({ session });

      const isTestMode = process.env.NODE_ENV !== "production";

      // GraphQL mutation to create app subscription
      const response = await client.query({
        data: {
          query: `
            mutation AppSubscriptionCreate(
              $name: String!
              $returnUrl: URL!
              $trialDays: Int
              $test: Boolean
              $lineItems: [AppSubscriptionLineItemInput!]!
            ) {
              appSubscriptionCreate(
                name: $name
                returnUrl: $returnUrl
                trialDays: $trialDays
                test: $test
                lineItems: $lineItems
              ) {
                appSubscription {
                  id
                  name
                  status
                  trialDays
                  currentPeriodEnd
                  test
                }
                confirmationUrl
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            name: `FeedBuilderly ${plan.displayName} Plan`,
            returnUrl: `https://${process.env.HOST}/billing/callback?shop=${shop}&plan=${planName}`,
            trialDays: 14, // 14-day free trial
            test: isTestMode, // Test mode for development
            lineItems: [
              {
                plan: {
                  appRecurringPricingDetails: {
                    price: {
                      amount: plan.price,
                      currencyCode: "USD",
                    },
                    interval: "EVERY_30_DAYS",
                  },
                },
              },
            ],
          },
        },
      });

      const result = response.body as any;

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }

      // Check for user errors
      const userErrors = result.data?.appSubscriptionCreate?.userErrors || [];
      if (userErrors.length > 0) {
        throw new Error(
          `Shopify billing error: ${userErrors[0].message} (${userErrors[0].field})`
        );
      }

      const confirmationUrl = result.data.appSubscriptionCreate.confirmationUrl;
      const chargeId = result.data.appSubscriptionCreate.appSubscription.id;

      console.log(
        `✅ Created ${
          isTestMode ? "TEST" : "LIVE"
        } subscription for ${shop}: ${chargeId}`
      );

      return { confirmationUrl, chargeId };
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
