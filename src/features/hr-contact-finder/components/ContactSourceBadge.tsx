"use client";

interface ContactSourceBadgeProps {
  source: 'hunter' | 'pattern';
}

export function ContactSourceBadge({ source }: ContactSourceBadgeProps) {
  const isHunter = source === 'hunter';

  const label = isHunter ? 'Hunter' : 'Pattern';
  const colorClasses = isHunter
    ? 'border-blue-700 bg-blue-900/30 text-blue-400'
    : 'border-yellow-700 bg-yellow-900/30 text-yellow-400';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}
    >
      {label}
    </span>
  );
}
