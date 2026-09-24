"use client";

import type { PredictionResult } from "@/lib/prediction";

interface Props {
  predictions: PredictionResult[];
  updatedAt: string;
}

export default function AlleySummary({ predictions, updatedAt }: Props) {
  const avg = predictions.reduce((a, b) => a + b.score, 0) / (predictions.length || 1);
  const prime = predictions.filter((p) => p.score >= 80).length;
  const blown = predictions.filter((p) => p.rating === "blown-out").length;

  const overallEmoji = avg >= 70 ? "🔥" : avg >= 50 ? "👍" : avg >= 30 ? "⚠️" : "❌";
  const overallLabel = avg >= 70 ? "HOT" : avg >= 50 ? "DECENT" : avg >= 30 ? "TOUGH" : "OFF";

  const dt = new Date(updatedAt);
  const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Michigan Overview</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl">{overallEmoji}</span>
            <div>
              <div className="text-2xl font-black text-white">{overallLabel}</div>
              <div className="text-sm text-gray-400">avg {Math.round(avg)}/100 overall</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <StatCell value={predictions.length} label="Rivers" color="text-white" />
          <StatCell value={prime} label="Prime" color="text-green-400" />
          <StatCell value={blown} label="Blown" color="text-red-400" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Live data — updated {dateStr} at {timeStr}</span>
        <span className="ml-auto text-gray-600">USGS + NOAA/NWS</span>
      </div>
    </div>
  );
}

function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-3 py-2">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
