import { redirect } from "next/navigation";
import Link from "next/link";
import { billingService } from "@/lib/services/billingService";
import { PLANS } from "@/lib/types/billing";
import { PlanCard } from "@/components/plan-card";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { shop?: string };
}) {
  const shop = searchParams.shop;

  if (!shop) {
    return redirect("/");
  }

  const currentSubscription = await billingService.getSubscription(shop);
  if (!currentSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Failed to get subscription</h1>
          <Link href={`/?shop=${shop}`} className="text-blue-400 hover:underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const plansArray = Object.entries(PLANS).map(([key, plan]) => ({
    key,
    ...plan,
    isCurrent: currentSubscription.planName === key,
    isRecommended: key === "pro",
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            🚀 FeedBuilderly
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Multi-channel feed generation for Shopify stores
          </p>

          <div className="inline-block bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full">
            <span className="text-slate-300">Current Plan: </span>
            <span className="font-bold text-white">
              {PLANS[currentSubscription.planName].displayName}
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plansArray.map((plan) => (
            <PlanCard key={plan.key} plan={plan} shop={shop} />
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
          <div className="text-center">
            <div className="text-5xl mb-4 drop-shadow-lg">🌍</div>
            <div className="text-xl font-bold text-white mb-2">22+ Formats</div>
            <div className="text-sm text-slate-400">
              Support for major EU & global platforms
            </div>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4 drop-shadow-lg">⚡</div>
            <div className="text-xl font-bold text-white mb-2">Auto Updates</div>
            <div className="text-sm text-slate-400">
              Feeds update automatically via cron & webhooks
            </div>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4 drop-shadow-lg">🔒</div>
            <div className="text-xl font-bold text-white mb-2">Secure & Reliable</div>
            <div className="text-sm text-slate-400">
              PostgreSQL caching, deployed on Fly.io
            </div>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4 drop-shadow-lg">📊</div>
            <div className="text-xl font-bold text-white mb-2">Analytics</div>
            <div className="text-sm text-slate-400">
              Track feed performance & cache stats
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-12">
          <Link
            href={`/?shop=${shop}`}
            className="inline-block px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
