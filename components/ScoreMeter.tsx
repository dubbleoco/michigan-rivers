"use client";

interface Props {
  score: number;
  size?: number;
}

export default function ScoreMeter({ score, size = 80 }: Props) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r; // half circle
  const filled = (score / 100) * circumference;

  const trackColor = "#1f2937"; // gray-800
  const fillColor =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 35 ? "#f97316" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Track */}
        <path
          d={`M 8,${cy} A ${r},${r} 0 0,1 ${size - 8},${cy}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M 8,${cy} A ${r},${r} 0 0,1 ${size - 8},${cy}`}
          fill="none"
          stroke={fillColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          strokeDashoffset={0}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={size * 0.22}
          fontWeight="bold"
          fill={fillColor}
          fontFamily="monospace"
        >
          {score}
        </text>
      </svg>
      <div className="text-xs text-gray-400 -mt-1">/ 100</div>
    </div>
  );
}
