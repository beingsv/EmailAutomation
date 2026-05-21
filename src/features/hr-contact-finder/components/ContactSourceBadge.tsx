"use client";

interface ContactSourceBadgeProps {
  source: 'hunter' | 'pattern';
}

export function ContactSourceBadge({ source }: ContactSourceBadgeProps) {
  const isHunter = source === 'hunter';

  const label = isHunter ? 'Hunter' : 'Pattern';
  const colorClasses = isHunter
    ? 'border-blue-200 bg-blue-50 text-blue-600'
    : 'border-yellow-200 bg-yellow-50 text-yellow-600';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}
    >
      {label}
    </span>
  );
}
