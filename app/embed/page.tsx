import { RIVERS } from "@/lib/rivers";
import { fetchUSGS } from "@/lib/usgs";
import { fetchNWSForecast } from "@/lib/nws";
import { predict } from "@/lib/prediction";
import { Fish } from "lucide-react";

export const revalidate = 900;

async function getData() {
  try {
    const siteIds = RIVERS.map((r) => r.siteId);
    const [usgsData, ...forecasts] = await Promise.all([
      fetchUSGS(siteIds),
      ...RIVERS.map((r) => fetchNWSForecast(r.coords[0], r.coords[1])),
    ]);
    return RIVERS.map((river, i) => {
      const gauge = usgsData[river.siteId] ?? {
        siteId: river.siteId,
        siteName: river.name,
        datetime: "",
        cfs: null,
        gaugeFt: null,
        waterTempC: null,
        waterTempF: null,
        cfsHistory: [],
      };
      return { river, gauge, prediction: predict(river, gauge, forecasts[i]) };
    });
  } catch {
    return [];
  }
}

export default async function EmbedPage() {
  const results = await getData();
  const sorted = [...results].sort((a, b) => b.prediction.score - a.prediction.score);
  const avg = results.reduce((a, b) => a + b.prediction.score, 0) / (results.length || 1);
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="bg-gray-950 text-white p-3 font-sans text-xs" style={{ minWidth: 280, maxWidth: 400 }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800">
        <Fish className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-sm">Steelhead Alley</span>
        <span className="text-gray-500 ml-auto">{date}</span>
      </div>

      {/* Overall */}
      <div className="flex items-center gap-2 mb-3 bg-gray-900 rounded-lg p-2">
        <span className="text-xl">
          {avg >= 70 ? "🔥" : avg >= 50 ? "👍" : avg >= 30 ? "⚠️" : "❌"}
        </span>
        <div>
          <div className="font-bold text-sm text-white">
            {avg >= 70 ? "HOT" : avg >= 50 ? "DECENT" : avg >= 30 ? "TOUGH" : "OFF SEASON"}
          </div>
          <div className="text-gray-400">Overall {Math.round(avg)}/100</div>
        </div>
      </div>

      {/* River list */}
      <div className="space-y-1.5">
        {sorted.map(({ river, gauge, prediction }) => (
          <div key={river.id} className="flex items-center gap-2 py-1 border-b border-gray-900">
            <span className="text-base w-5 text-center leading-none">{prediction.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white truncate">{river.name}</div>
              <div className="text-gray-500">
                {gauge.cfs !== null ? `${gauge.cfs.toLocaleString()} CFS` : "N/A"}
                {gauge.waterTempF !== null ? ` · ${gauge.waterTempF}°F` : ""}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`font-bold ${
                  prediction.score >= 80
                    ? "text-green-400"
                    : prediction.score >= 60
                    ? "text-yellow-400"
                    : prediction.score >= 35
                    ? "text-orange-400"
                    : "text-red-400"
                }`}
              >
                {prediction.score}
              </div>
              <div className="text-gray-600">/ 100</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-800 text-gray-600 text-center">
        USGS + NOAA · steelheadalley.com
      </div>
    </div>
  );
}
