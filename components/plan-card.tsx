"use client";

import Link from "next/link";

interface PlanCardProps {
  plan: {
    key: string;
    displayName: string;
    price: number;
    maxProducts: number;
    features: string[];
    isCurrent: boolean;
    isRecommended: boolean;
  };
  shop: string;
}

export function PlanCard({ plan, shop }: PlanCardProps) {
  const { key, displayName, price, maxProducts, features, isCurrent, isRecommended } = plan;

  return (
    <div
      className={`relative bg-white/5 backdrop-blur-xl border rounded-3xl p-8 transition-all hover:-translate-y-2 hover:shadow-2xl ${
        isRecommended
          ? "border-blue-500/50 bg-blue-600/10 scale-105 shadow-xl shadow-blue-500/20"
          : isCurrent
          ? "border-green-500/40 bg-green-600/5"
          : "border-white/10 hover:border-blue-500/30"
      }`}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute top-5 right-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          POPULAR
        </div>
      )}

      {/* Plan name */}
      <div className="text-2xl font-bold text-white mb-3">{displayName}</div>

      {/* Price */}
      <div className="text-5xl font-extrabold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-1">
        ${price}
        <span className="text-lg text-slate-400 font-medium">/month</span>
      </div>

      {/* Products */}
      <div className="text-slate-400 text-sm mb-8 pb-6 border-b border-white/10">
        {maxProducts === 0 ? "Unlimited" : `Up to ${maxProducts}`} products
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-slate-300 text-sm">
            <span className="flex-shrink-0 w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold">
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      {isCurrent ? (
        <button
          disabled
          className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold cursor-default shadow-lg"
        >
          Current Plan
        </button>
      ) : price === 0 ? (
        <Link
          href={`/api/billing/select?shop=${shop}&plan=${key}`}
          className="block w-full py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-center rounded-xl font-semibold transition-all"
        >
          Downgrade
        </Link>
      ) : (
        <Link
          href={`/api/billing/select?shop=${shop}&plan=${key}`}
          className="block w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/40"
        >
          Choose Plan
        </Link>
      )}
    </div>
  );
}
