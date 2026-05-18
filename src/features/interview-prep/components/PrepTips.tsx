"use client";

interface PrepTipsProps {
  tips: string[];
}

export function PrepTips({ tips }: PrepTipsProps) {
  return (
    <div className="space-y-3">
      {tips.map((tip, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4"
        >
          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-900/40 border border-green-700 text-green-400 text-xs font-bold">
            {index + 1}
          </span>
          <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
        </div>
      ))}
    </div>
  );
}
