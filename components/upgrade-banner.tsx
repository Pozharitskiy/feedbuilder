import Link from "next/link";

interface UpgradeBannerProps {
  shop: string;
}

export function UpgradeBanner({ shop }: UpgradeBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-blue-500/30 rounded-2xl p-8 text-center backdrop-blur-xl mt-8">
      <h3 className="text-2xl font-bold text-white mb-2">
        🎯 Unlock All Features
      </h3>
      <p className="text-slate-300 mb-6">
        Get access to 22+ feed formats and unlimited products with our Pro plan
      </p>
      <Link
        href={`/billing/pricing?shop=${shop}`}
        className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/40"
      >
        View Plans →
      </Link>
    </div>
  );
}
