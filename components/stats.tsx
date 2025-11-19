interface StatsProps {
  formats: string;
  maxProducts: string;
  trialDays: string;
}

export function Stats({ formats, maxProducts, trialDays }: StatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center backdrop-blur-xl">
        <div className="text-3xl font-extrabold text-white mb-1">{formats}</div>
        <div className="text-sm text-slate-400 font-medium">Feed Formats</div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center backdrop-blur-xl">
        <div className="text-3xl font-extrabold text-white mb-1">{maxProducts}</div>
        <div className="text-sm text-slate-400 font-medium">Max Products</div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center backdrop-blur-xl">
        <div className="text-3xl font-extrabold text-white mb-1">{trialDays}</div>
        <div className="text-sm text-slate-400 font-medium">Trial Days</div>
      </div>
    </div>
  );
}
