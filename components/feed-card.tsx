"use client";

interface FeedCardProps {
  shop: string;
  format: string;
}

export function FeedCard({ shop, format }: FeedCardProps) {
  const handleClick = () => {
    window.open(`/api/feed/${shop}/${format}`, "_blank");
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:bg-white/8 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/20"
    >
      <div className="text-2xl font-bold text-white mb-2">
        {format.toUpperCase()}
      </div>
      <div className="text-xs text-slate-400 font-mono break-all bg-black/20 px-3 py-2 rounded-lg">
        /feed/{shop}/{format}
      </div>
    </div>
  );
}
