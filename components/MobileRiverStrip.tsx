import type { River } from "@/lib/rivers";
import type { GaugeReading } from "@/lib/usgs";
import type { PredictionResult } from "@/lib/prediction";

interface RiverSummary {
  river: River;
  gauge: GaugeReading;
  prediction: PredictionResult;
}

interface Props {
  items: RiverSummary[];
}

function scoreBar(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-400";
  if (score >= 35) return "bg-orange-400";
  return "bg-red-500";
}

function scoreDot(score: number) {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  if (score >= 35) return "🟠";
  return "🔴";
}

export default function MobileRiverStrip({ items }: Props) {
  const sorted = [...items].sort((a, b) => b.prediction.score - a.prediction.score);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Quick view</span>
        <span className="text-xs text-gray-600">scroll cards below ↓</span>
      </div>
      <div className="divide-y divide-gray-800">
        {sorted.map(({ river, gauge, prediction }) => (
          <div key={river.id} className="flex items-center gap-3 px-3 py-2">
            <span className="text-sm leading-none">{scoreDot(prediction.score)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">{river.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{river.state}</span>
                {prediction.trendResult.isPostSpikePrime && (
                  <span className="text-xs leading-none">🔥</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-800 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${scoreBar(prediction.score)}`}
                    style={{ width: `${prediction.score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono w-8 text-right shrink-0">
                  {prediction.score}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-gray-300 font-medium">
                {gauge.cfs !== null ? `${gauge.cfs.toLocaleString()} CFS` : "N/A"}
              </div>
              <div className="text-xs text-gray-500">
                {gauge.waterTempF !== null ? `${gauge.waterTempF}°F` : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
