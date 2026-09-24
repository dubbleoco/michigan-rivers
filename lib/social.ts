import { River } from "./rivers";
import { GaugeReading } from "./usgs";
import { PredictionResult } from "./prediction";
import { clarityShortLabel } from "./clarity";
import { format } from "date-fns";

export interface RiverSummary {
  river: River;
  gauge: GaugeReading;
  prediction: PredictionResult;
}

export function generateSocialPost(summaries: RiverSummary[]): string {
  const date = format(new Date(), "MMM d");
  const lines: string[] = [`🎣 Michigan Rivers Conditions — ${date}\n`];

  for (const { river, gauge, prediction } of summaries) {
    const cfsStr = gauge.cfs !== null ? `${gauge.cfs.toLocaleString()} CFS` : "N/A";
    const tempStr = gauge.waterTempF !== null ? ` | ${gauge.waterTempF}°F` : "";
    const trendIcon =
      prediction.trend === "rising" ? "↑" : prediction.trend === "falling" ? "↓" : "→";
    const clarityStr = ` | ${clarityShortLabel(prediction.clarity)}`;
    lines.push(
      `${prediction.emoji} ${river.name}: ${cfsStr}${tempStr}${clarityStr} ${trendIcon} — ${prediction.label}`
    );
  }

  lines.push(
    "\n#salmon #steelhead #Michigan #flyfishing #salmonrun #MichiganFishing #fishing"
  );

  return lines.join("\n");
}

export function generateDetailedPost(
  summary: RiverSummary,
  includeHashtags = true
): string {
  const { river, gauge, prediction } = summary;
  const date = format(new Date(), "EEEE, MMMM d");
  const lines: string[] = [];

  lines.push(`${prediction.emoji} ${river.name.toUpperCase()} — ${date}`);
  lines.push(`Score: ${prediction.score}/100 · ${prediction.label}`);
  lines.push("");

  if (gauge.cfs !== null)
    lines.push(`💧 Flow: ${gauge.cfs.toLocaleString()} CFS (ideal: ${river.idealMin}–${river.idealMax})`);
  if (gauge.gaugeFt !== null)
    lines.push(`📏 Gauge: ${gauge.gaugeFt.toFixed(2)} ft`);
  if (gauge.waterTempF !== null)
    lines.push(`🌡️ Water Temp: ${gauge.waterTempF}°F`);
  lines.push(`👁️ Clarity: ${prediction.clarity.label} — ${prediction.clarity.detail}`);

  lines.push("");
  lines.push(`📊 Conditions: ${prediction.flowStatus}`);
  if (prediction.details.length > 0) {
    lines.push(`ℹ️ ${prediction.details[0]}`);
  }

  if (includeHashtags) {
    lines.push(
      "\n#salmon #steelhead #Michigan #flyfishing #MichiganFishing #fishing #" +
        river.state.replace("/", "").replace(" ", "")
    );
  }

  return lines.join("\n");
}

export function generateWeeklyOutlook(summaries: RiverSummary[]): string {
  const date = format(new Date(), "MMMM d");
  const best = summaries
    .filter((s) => s.prediction.score > 0)
    .sort((a, b) => b.prediction.score - a.prediction.score)
    .slice(0, 3);

  const lines: string[] = [
    `🎣 MICHIGAN RIVERS WEEKLY OUTLOOK — ${date}`,
    "",
    "TOP RIVERS THIS WEEK:",
  ];

  for (const { river, prediction } of best) {
    lines.push(`${prediction.emoji} ${river.name} (${river.state}) — ${prediction.label} · ${prediction.score}/100`);
    if (prediction.details[0]) lines.push(`   → ${prediction.details[0]}`);
  }

  const overallScore =
    summaries.reduce((a, b) => a + b.prediction.score, 0) / (summaries.length || 1);
  const overallRating = overallScore >= 70 ? "🔥 HOT" : overallScore >= 45 ? "👍 SOLID" : "⚠️ TOUGH";
  lines.push("");
  lines.push(`Overall Rating: ${overallRating} (avg ${Math.round(overallScore)}/100)`);
  lines.push(
    "\n#salmon #steelhead #Michigan #flyfishing #MichiganFishing #fishing #weeklyoutlook"
  );

  return lines.join("\n");
}
