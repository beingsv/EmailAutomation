"use client";

interface ScoreDisplayProps {
  overallScore: number;
  keywordScore: number;
  llmScore: number | null;
  aiUnavailable: boolean;
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
  if (score < 40) {
    return { stroke: "stroke-red-500", text: "text-red-400", bg: "bg-red-900/30" };
  }
  if (score <= 70) {
    return { stroke: "stroke-yellow-500", text: "text-yellow-400", bg: "bg-yellow-900/30" };
  }
  return { stroke: "stroke-green-500", text: "text-green-400", bg: "bg-green-900/30" };
}

function getScoreLabel(score: number): string {
  if (score < 40) return "Low Match";
  if (score <= 70) return "Moderate Match";
  return "Strong Match";
}

export function ScoreDisplay({ overallScore, keywordScore, llmScore, aiUnavailable }: ScoreDisplayProps) {
  const colors = getScoreColor(overallScore);

  // SVG circular gauge parameters
  const size = 150;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (overallScore / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="flex flex-col items-center">
      {/* Circular Gauge */}
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-800"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={colors.stroke}
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${colors.text}`}>{overallScore}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>

      {/* Score label */}
      <p className={`mt-3 text-sm font-medium ${colors.text}`}>{getScoreLabel(overallScore)}</p>

      {/* Score breakdown */}
      <div className="mt-4 w-full max-w-xs space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
          <span className="text-xs text-gray-400">Keyword Score</span>
          <span className="text-sm font-medium text-gray-100">{keywordScore}/100</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
          <span className="text-xs text-gray-400">AI Score</span>
          <span className="text-sm font-medium text-gray-100">
            {llmScore !== null ? `${llmScore}/100` : "N/A"}
          </span>
        </div>
      </div>

      {/* AI unavailable notice */}
      {aiUnavailable && (
        <div className="mt-4 w-full max-w-xs rounded-lg border border-yellow-700 bg-yellow-900/30 px-3 py-2">
          <p className="text-xs text-yellow-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            AI analysis unavailable — showing keyword-only score
          </p>
        </div>
      )}
    </div>
  );
}
