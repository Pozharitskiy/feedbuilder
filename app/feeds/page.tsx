import { redirect } from "next/navigation";
import Link from "next/link";
import { billingService } from "@/lib/services/billingService";
import { PLANS } from "@/lib/types/billing";
import { IMPLEMENTED_FORMATS } from "@/lib/types/feed";
import { FeedCard } from "@/components/feed-card";

export default async function FeedsPage({
  searchParams,
}: {
  searchParams: { shop?: string };
}) {
  const shop = searchParams.shop;

  if (!shop) {
    return redirect("/");
  }

  // Get subscription to check available formats
  const subscription = await billingService.getSubscription(shop);
  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Subscription not found</h1>
          <Link
            href={`/?shop=${shop}`}
            className="text-blue-400 hover:underline"
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const plan = PLANS[subscription.planName];
  const availableFormats =
    plan.formats === "all"
      ? IMPLEMENTED_FORMATS
      : IMPLEMENTED_FORMATS.filter((f) =>
          ["google", "facebook", "csv"].includes(f)
        );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            🚀 Your Feeds
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Available feed formats for {shop}
          </p>

          <div className="inline-block bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full">
            <span className="text-slate-300">Current Plan: </span>
            <span className="font-bold text-white">{plan.displayName}</span>
          </div>
        </div>

        {/* Feeds Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
          {availableFormats.map((format) => (
            <FeedCard key={format} shop={shop} format={format} />
          ))}
        </div>

        {/* Back Links */}
        <div className="flex justify-center gap-4">
          <Link
            href={`/?shop=${shop}`}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href={`/billing/pricing?shop=${shop}`}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            Change Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
