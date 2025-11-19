import { redirect } from "next/navigation";
import { billingService } from "@/lib/services/billingService";
import { sessionStorage } from "@/lib/shopify";
import { DashboardCard } from "@/components/dashboard-card";
import { Stats } from "@/components/stats";
import { UpgradeBanner } from "@/components/upgrade-banner";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { shop?: string };
}) {
  const shop = searchParams.shop;

  // If no shop parameter, show status
  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">✅ FeedBuilderly</h1>
          <p className="text-muted-foreground">Backend is running</p>
        </div>
      </div>
    );
  }

  // Check if we have a session for this shop
  const offlineSession = await sessionStorage.loadSession(`offline_${shop}`);

  if (!offlineSession) {
    console.log(`⚠️ No session for ${shop}, redirecting to install...`);
    redirect(`/install?shop=${shop}`);
  }

  // Get subscription info
  const subscription = await billingService.getSubscription(shop);
  const plan = subscription ? billingService.getPlan(subscription.planName) : null;
  const isFree = !subscription || subscription.planName === "free";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            FeedBuilderly
          </h1>
          <p className="text-slate-400 text-lg">
            Multi-channel feed generator for Shopify
          </p>
        </div>

        {/* Shop Info */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="text-white font-semibold">📦 {shop}</div>
          <div
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isFree
                ? "bg-slate-500/20 text-slate-300"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
            }`}
          >
            {plan ? plan.displayName : "Free"} Plan
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <DashboardCard
            href={`/feeds?shop=${shop}`}
            icon="📊"
            title="View Feeds"
            description={`Access your product feeds in ${
              plan && plan.formats === "all" ? "22+" : "3"
            } formats`}
          />

          <DashboardCard
            href="/api/formats"
            icon="🌍"
            title="API & Formats"
            description="Explore all available feed formats"
          />

          <DashboardCard
            href={`/billing/pricing?shop=${shop}`}
            icon={isFree ? "⭐" : "💎"}
            title={isFree ? "Upgrade Plan" : "Manage Plan"}
            description={
              isFree ? "Unlock all features" : "View pricing & features"
            }
          />
        </div>

        {/* Upgrade Banner or Stats */}
        {isFree ? (
          <UpgradeBanner shop={shop} />
        ) : plan ? (
          <Stats
            formats={plan.formats === "all" ? "22+" : "3"}
            maxProducts={plan.maxProducts === 0 ? "∞" : plan.maxProducts.toString()}
            trialDays="14"
          />
        ) : null}
      </div>
    </div>
  );
}
