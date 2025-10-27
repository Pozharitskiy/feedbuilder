// Billing types and configuration

export type PlanName = "free" | "basic" | "pro" | "enterprise";

export interface Plan {
  name: PlanName;
  displayName: string;
  price: number; // USD per month
  maxProducts: number; // 0 = unlimited
  updateInterval: number; // minutes
  formats: "limited" | "all";
  limitedFormats?: string[]; // only for free plan
  features: string[];
}

export interface Subscription {
  shop: string;
  planName: PlanName;
  status: "active" | "cancelled" | "expired" | "trial";
  chargeId?: string; // Shopify charge ID
  activatedAt: Date;
  expiresAt?: Date;
  trialEndsAt?: Date;
}

export const PLANS: Record<PlanName, Plan> = {
  free: {
    name: "free",
    displayName: "Free",
    price: 0,
    maxProducts: 100,
    updateInterval: 1440, // 24 hours
    formats: "limited",
    limitedFormats: ["google-shopping", "facebook", "yandex-yml"],
    features: [
      "✅ 3 basic formats (Google, Facebook, Yandex)",
      "✅ Up to 100 products",
      "✅ Daily updates",
      "✅ Email support",
    ],
  },
  basic: {
    name: "basic",
    displayName: "Basic",
    price: 9.99,
    maxProducts: 1000,
    updateInterval: 360, // 6 hours
    formats: "all",
    features: [
      "✅ All 22+ formats",
      "✅ Up to 1,000 products",
      "✅ Updates every 6 hours",
      "✅ Priority email support",
      "✅ Webhook invalidation",
    ],
  },
  pro: {
    name: "pro",
    displayName: "Pro",
    price: 29.99,
    maxProducts: 0, // unlimited
    updateInterval: 60, // 1 hour
    formats: "all",
    features: [
      "✅ All 22+ formats",
      "✅ Unlimited products",
      "✅ Updates every hour",
      "✅ Priority support (24h response)",
      "✅ Webhook invalidation",
      "✅ Custom format requests",
      "✅ Feed customization",
    ],
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    price: 99.0,
    maxProducts: 0, // unlimited
    updateInterval: 15, // 15 minutes
    formats: "all",
    features: [
      "✅ All formats + custom formats",
      "✅ Unlimited products",
      "✅ Updates every 15 minutes",
      "✅ Dedicated support manager",
      "✅ White-label feeds",
      "✅ API access",
      "✅ Multi-store (up to 5 stores)",
      "✅ SLA guarantee",
    ],
  },
};

// Free plan allowed formats
export const FREE_FORMATS = [
  "google-shopping",
  "facebook",
  "yandex-yml",
] as const;

export function isPlanAllowed(
  planName: PlanName,
  format: string,
  productsCount: number
): { allowed: boolean; reason?: string } {
  const plan = PLANS[planName];

  // Check product limit
  if (plan.maxProducts > 0 && productsCount > plan.maxProducts) {
    return {
      allowed: false,
      reason: `Product limit exceeded. Upgrade to access more than ${plan.maxProducts} products.`,
    };
  }

  // Check format access
  if (plan.formats === "limited" && plan.limitedFormats) {
    if (!plan.limitedFormats.includes(format)) {
      return {
        allowed: false,
        reason: `Format "${format}" not available in Free plan. Upgrade to access all formats.`,
      };
    }
  }

  return { allowed: true };
}

export function getRecommendedPlan(productsCount: number): PlanName {
  if (productsCount <= 100) return "free";
  if (productsCount <= 1000) return "basic";
  return "pro";
}
