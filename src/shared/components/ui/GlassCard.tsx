"use client";

import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
}

export function GlassCard({ children, className = "", gradient = false, hover = false }: GlassCardProps) {
  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        bg-white/80 backdrop-blur-xl
        border border-gray-200/60
        ${gradient ? "gradient-border" : ""}
        ${hover ? "transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
