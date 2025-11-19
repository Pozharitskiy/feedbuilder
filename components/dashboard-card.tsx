"use client";

import Link from "next/link";
import { useState } from "react";

interface DashboardCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
}

export function DashboardCard({
  href,
  icon,
  title,
  description,
}: DashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      className="group relative block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/8 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/20 relative overflow-hidden">
        {/* Animated top border */}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 transition-transform duration-300 origin-left ${
            isHovered ? "scale-x-100" : "scale-x-0"
          }`}
        />

        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
    </Link>
  );
}
