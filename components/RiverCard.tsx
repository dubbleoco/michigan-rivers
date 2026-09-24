"use client";

import { useState } from "react";
import { Droplets, Thermometer, Ruler, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Eye, MessageSquare, ExternalLink } from "lucide-react";
import FlowSparkline from "./FlowSparkline";
import ScoreMeter from "./ScoreMeter";
import type { River } from "@/lib/rivers";
import type { GaugeReading } from "@/lib/usgs";
import type { LocationForecast } from "@/lib/nws";
import type { PredictionResult } from "@/lib/prediction";
import type { FishingReport } from "@/lib/reports";

interface Props {
  river: River;
  gauge: GaugeReading;
  forecast: LocationForecast | null;
  prediction: PredictionResult;
  reports?: FishingReport[];
}

const SOURCE_LABEL: Record<string, string> = {
  reddit:    "Reddit",
  user:      "Local",
  orvis:     "Orvis",
  mdnr:      "MI DNR",
  localshop: "Guide Shop",
  nydec:     "DNR",
};

const RATING_BORDER: Record<string, string> = {
  excellent:  "border-green-500",
  good:       "border-yellow-400",
  fair:       "border-orange-400",
  poor:       "border-red-500",
  "blown-out":"border-red-700",
  "no-data":  "border-gray-700",
};

const RATING_BG: Record<string, string> = {
  excellent:  "bg-green-500/5",
  good:       "bg-yellow-400/5",
  fair:       "bg-orange-400/5",
  poor:       "bg-red-500/5",
  "blown-out":"bg-red-700/10",
  "no-data":  "bg-gray-800/50",
};

const SCORE_COLOR: Record<string, string> = {
  excellent:  "text-green-400",
  good:       "text-yellow-400",
  fair:       "text-orange-400",
  poor:       "text-red-400",
  "blown-out":"text-red-700",
  "no-data":  "text-gray-500",
};

const SPARKLINE_COLORS: Record<string, string> = {
  excellent: "#22c55e",
  good: "#eab308",
  fair: "#f97316",
  poor: "#ef4444",
  "blown-out": "#7f1d1d",
  "no-data": "#4b5563",
};

function clarityColor(score: number): string {
  if (score >= 9) return "text-green-400";
  if (score >= 7) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

export default function RiverCard({ river, gauge, forecast, prediction, reports = [] }: Props) {
  const [expanded, setExpanded] = useState(false);
  const border  = RATING_BORDER[prediction.rating] ?? RATING_BORDER["no-data"];
  const bg      = RATING_BG[prediction.rating]     ?? RATING_BG["no-data"];
  const scoreColor = SCORE_COLOR[prediction.rating] ?? "text-gray-500";
  const sparkColor = SPARKLINE_COLORS[prediction.rating] ?? "#4b5563";
  const clarity = prediction.clarity;

  const TrendIcon =
    prediction.trend === "rising"  ? TrendingUp  :
    prediction.trend === "falling" ? TrendingDown : Minus;

  const trendColor =
    prediction.trend === "rising"  ? "text-blue-400"  :
    prediction.trend === "falling" ? "text-green-400" : "text-gray-400";

  const nextFc = forecast?.periods?.[0];

  return (
    <div className={`rounded-xl border-2 ${border} ${bg} transition-all duration-200`}>
      {/* ── Collapsed header ──────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors rounded-xl"
      >
        {/* River info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm leading-tight">{river.name}</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{river.state}</span>
            {prediction.trendResult.isPostSpikePrime && <span className="text-sm leading-none">🔥</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 truncate">
            {prediction.label}
            {prediction.flowStatus && prediction.flowStatus !== "No data"
              ? ` — ${prediction.flowStatus}`
              : ""}
          </div>
        </div>

        {/* Score + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-2xl font-black tabular-nums ${scoreColor}`}>
            {prediction.score}
          </span>
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-gray-500" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* ── Expanded content ──────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-3">
          {/* Score ring + location */}
          <div className="flex items-center gap-3">
            <ScoreMeter score={prediction.score} size={56} />
            <div>
              <div className="text-xs text-gray-500">{river.location}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-base leading-none">{prediction.emoji}</span>
                <span className="text-sm font-semibold text-white">{prediction.label}</span>
                <span className="text-xs text-gray-400">— {prediction.flowStatus}</span>
              </div>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat
              icon={<Droplets className="w-3.5 h-3.5" />}
              label="Flow"
              value={gauge.cfs !== null ? `${gauge.cfs.toLocaleString()} CFS` : "N/A"}
              sub={`ideal ${river.idealMin}–${river.idealMax}`}
            />
            <Stat
              icon={<Thermometer className="w-3.5 h-3.5" />}
              label="Water Temp"
              value={gauge.waterTempF !== null ? `${gauge.waterTempF}°F` : "N/A"}
              sub="ideal 40–55°F"
            />
            <FlowGaugeStat
              gaugeFt={gauge.gaugeFt}
              idealGaugeFtMin={river.idealGaugeFtMin}
              idealGaugeFtMax={river.idealGaugeFtMax}
              flowScore={prediction.flowScore}
              flowStatus={prediction.flowStatus}
            />
          </div>

          {/* Water Clarity */}
          <div className="bg-gray-800/50 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">Water Clarity</span>
              {clarity.source === "estimated" && (
                <span className="text-xs text-gray-600 ml-auto">estimated</span>
              )}
              {clarity.ntu !== null && (
                <span className="text-xs text-gray-600 ml-auto">{clarity.ntu} NTU</span>
              )}
            </div>
            <div className={`text-sm font-bold ${clarityColor(clarity.score)}`}>
              {clarity.label}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{clarity.detail}</div>
          </div>

          {/* Post-spike banner */}
          {prediction.trendResult.isPostSpikePrime && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-2.5 py-1.5">
              <span className="text-base leading-none">🔥</span>
              <span className="text-xs font-semibold text-green-300">
                Post-spike prime window — fish are moving in
              </span>
            </div>
          )}

          {/* Trend + sparkline */}
          <div>
            <div className={`flex items-start gap-1.5 text-xs font-medium mb-1 ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{prediction.trendResult.label}</span>
            </div>
            <FlowSparkline
              history={gauge.cfsHistory}
              idealMin={river.idealMin}
              idealMax={river.idealMax}
              color={sparkColor}
            />
          </div>

          {/* Score breakdown */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Score Breakdown</h3>
            <div className="space-y-1">
              <ScoreRow label="Flow"         value={prediction.flowScore}    max={30} />
              <ScoreRow label="Flow Trend"   value={prediction.trendScore}   max={25} />
              <ScoreRow label="Water Temp"   value={prediction.tempScore}    max={20} />
              <ScoreRow label="Season"       value={prediction.seasonScore}  max={15} />
              <ScoreRow label="Water Clarity"value={prediction.clarityScore} max={10} />
              <ScoreRow label="Precip Outlook"value={prediction.precipBonus} max={5}  />
              {prediction.communityBonus !== 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-gray-400 shrink-0">Community</span>
                  <div className="flex-1" />
                  <span className={`w-12 text-right font-mono ${prediction.communityBonus > 0 ? "text-green-400" : "text-red-400"}`}>
                    {prediction.communityBonus > 0 ? "+" : ""}{prediction.communityBonus} pts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Conditions detail bullets */}
          {prediction.details.filter(
            (d) => !d.startsWith("Water clarity:") && d !== prediction.trendResult.label
          ).length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Conditions</h3>
              <ul className="space-y-1">
                {prediction.details
                  .filter((d) => !d.startsWith("Water clarity:") && d !== prediction.trendResult.label)
                  .map((d, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-1.5">
                      <span className="text-gray-600 mt-0.5">•</span>
                      {d}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Forecast */}
          {nextFc && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Forecast</h3>
              <div className="grid grid-cols-2 gap-2">
                {forecast?.periods?.slice(0, 4).map((p, i) => (
                  <div key={i} className="bg-gray-800/60 rounded-lg p-2">
                    <div className="text-xs font-medium text-gray-300">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.temp}°{p.tempUnit}</div>
                    <div className="text-xs text-gray-400 truncate">{p.shortForecast}</div>
                    {(p.precipChance ?? 0) > 0 && (
                      <div className="text-xs text-blue-400">{p.precipChance}% precip</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community reports */}
          {reports.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Community Reports
              </h3>
              <div className="space-y-2">
                {reports.map((r) => (
                  <ReportItem key={r.id} report={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function gaugeQuality(flowScore: number, flowStatus: string): { label: string; color: string } {
  if (flowStatus === "Blown out" || flowStatus.includes("blown")) return { label: "Flood stage",   color: "text-red-400" };
  if (flowStatus.includes("Very high"))   return { label: "Very high",    color: "text-red-400" };
  if (flowStatus.includes("Very low"))    return { label: "Very low",     color: "text-orange-400" };
  if (flowStatus.includes("High"))        return { label: "Running high", color: "text-orange-400" };
  if (flowStatus === "Prime conditions")  return { label: "Prime range",  color: "text-green-400" };
  if (flowStatus.includes("Below ideal")) return { label: "Fishable",     color: "text-yellow-400" };
  if (flowScore >= 20) return { label: "Prime range", color: "text-green-400" };
  if (flowScore >= 12) return { label: "Fishable",    color: "text-yellow-400" };
  if (flowScore >= 5)  return { label: "Marginal",    color: "text-orange-400" };
  return { label: "Out of range", color: "text-red-400" };
}

function FlowGaugeStat({
  gaugeFt,
  idealGaugeFtMin,
  idealGaugeFtMax,
  flowScore,
  flowStatus,
}: {
  gaugeFt: number | null;
  idealGaugeFtMin: number;
  idealGaugeFtMax: number;
  flowScore: number;
  flowStatus: string;
}) {
  const quality = gaugeQuality(flowScore, flowStatus);

  return (
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="flex items-center gap-1 text-gray-400 mb-0.5">
        <Ruler className="w-3.5 h-3.5" />
        <span className="text-xs">Gauge Ht</span>
      </div>
      <div className="text-sm font-bold text-white">
        {gaugeFt !== null ? `${gaugeFt.toFixed(2)} ft` : "N/A"}
      </div>
      {gaugeFt !== null && (
        <div className={`text-xs font-medium ${quality.color}`}>{quality.label}</div>
      )}
      <div className="text-xs text-gray-500">{idealGaugeFtMin}–{idealGaugeFtMax} ft ideal</div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="flex items-center gap-1 text-gray-400 mb-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}
    </div>
  );
}

function ReportItem({ report }: { report: FishingReport }) {
  const sentimentColor =
    report.sentiment === "positive" ? "text-green-400" :
    report.sentiment === "negative" ? "text-red-400"   : "text-gray-400";
  const sentimentDot =
    report.sentiment === "positive" ? "🟢" :
    report.sentiment === "negative" ? "🔴" : "⚪";

  const ratingBadge: Record<string, string> = {
    excellent: "bg-green-500/20 text-green-300",
    good:      "bg-yellow-500/20 text-yellow-300",
    fair:      "bg-orange-500/20 text-orange-300",
    poor:      "bg-red-500/20 text-red-300",
  };

  const timeAgo = (ts: string) => {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  return (
    <div className="bg-gray-800/40 rounded-lg p-2.5 space-y-1">
      <div className="flex items-start gap-2 justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs leading-none">{sentimentDot}</span>
          <span className={`text-xs font-medium truncate ${sentimentColor}`}>{report.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {report.rating && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ratingBadge[report.rating] ?? ""}`}>
              {report.rating}
            </span>
          )}
          <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
            {SOURCE_LABEL[report.source] ?? report.source}
          </span>
        </div>
      </div>
      {report.body && (
        <p className="text-xs text-gray-400 line-clamp-2">{report.body}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span>{report.author}</span>
        <span>·</span>
        <span>{timeAgo(report.timestamp)}</span>
        {report.upvotes !== undefined && (
          <>
            <span>·</span>
            <span>↑{report.upvotes}</span>
          </>
        )}
        {report.url && (
          <a
            href={report.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-blue-500 hover:text-blue-400 flex items-center gap-0.5"
          >
            view <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ScoreRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-gray-300 font-mono">
        {value}/{max}
      </span>
    </div>
  );
}
