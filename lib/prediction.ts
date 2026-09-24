import { GaugeReading } from "./usgs";
import { LocationForecast } from "./nws";
import { River } from "./rivers";
import { getClarity, ClarityResult } from "./clarity";
import { FishingReport, communityScoreBonus } from "./reports";

export interface TrendResult {
  score: number;           // 0-25
  trend: "rising" | "falling" | "steady";
  label: string;           // plain-English description
  isPostSpikePrime: boolean; // river dropped off a spike — call to action
  peakCFS: number | null;  // highest CFS in the 48h window
  dropFromPeak: number;    // fraction fallen from peak (0-1)
}

export interface PredictionResult {
  score: number; // 0-100
  rating: "excellent" | "good" | "fair" | "poor" | "blown-out" | "no-data";
  label: string;
  emoji: string;
  flowScore: number;      // max 30
  tempScore: number;      // max 20
  clarityScore: number;   // max 10
  trendScore: number;     // max 25
  seasonScore: number;    // max 15
  precipBonus: number;    // max 5
  communityBonus: number; // -8 to +12 from recent reports
  flowStatus: string;
  trendResult: TrendResult;
  trend: "rising" | "falling" | "steady";
  clarity: ClarityResult;
  communitySummary: string | null;
  details: string[];
}

// ── Point budget ─────────────────────────────────────────────────────
// Flow: 0-30   Water temp: 0-20   Clarity: 0-10
// Trend: 0-25  Season: 0-15       Precip: 0-5    → capped at 100

export function predict(
  river: River,
  gauge: GaugeReading,
  forecast: LocationForecast | null,
  allReports: FishingReport[] = [],
  now = new Date()
): PredictionResult {
  const details: string[] = [];

  // ── Flow score (0-30) ────────────────────────────────────────────
  let flowScore = 0;
  let flowStatus = "No data";
  const cfs = gauge.cfs;

  if (cfs !== null) {
    const { idealMin, idealMax } = river;
    const mid = (idealMin + idealMax) / 2;

    if (cfs < idealMin * 0.4) {
      flowScore = 4;
      flowStatus = "Very low — fish stacked, technical";
    } else if (cfs < idealMin) {
      flowScore = Math.round(4 + ((cfs - idealMin * 0.4) / (idealMin * 0.6)) * 15);
      flowStatus = "Below ideal — fishable";
    } else if (cfs <= idealMax) {
      const fromMid = Math.abs(cfs - mid) / (idealMax - idealMin);
      flowScore = Math.round(30 - fromMid * 11);
      flowStatus = "Prime conditions";
    } else if (cfs <= idealMax * 1.5) {
      // High but not blown — still gets real points because trend can redeem this
      flowScore = Math.round(20 - ((cfs - idealMax) / (idealMax * 0.5)) * 10);
      flowStatus = "High — tough but fishable";
    } else if (cfs <= idealMax * 2.5) {
      flowScore = 5;
      flowStatus = "Very high — blown out";
    } else {
      flowScore = 0;
      flowStatus = "Blown out";
    }

    details.push(`Flow ${cfs.toLocaleString()} CFS (ideal ${idealMin}–${idealMax})`);
  }

  // ── Trend score (0-25) ───────────────────────────────────────────
  const trendResult = scoreTrend(gauge, river);
  const { trend } = trendResult;
  details.push(trendResult.label);

  // ── Water clarity score (0-10) ───────────────────────────────────
  const clarity = getClarity(gauge, river);
  const clarityScore = clarity.score;
  details.push(`Water clarity: ${clarity.label}`);

  // ── Water temp score (0-20) ──────────────────────────────────────
  let tempScore = 0;
  const tempF = gauge.waterTempF;

  if (tempF !== null) {
    // Salmon tolerate slightly warmer water than steelhead-only systems
    if (tempF >= 40 && tempF <= 55) {
      tempScore = 20;
      details.push(`Water ${tempF}°F — ideal temp`);
    } else if (tempF >= 33 && tempF < 40) {
      tempScore = Math.round(8 + ((tempF - 33) / 7) * 12);
      details.push(`Water ${tempF}°F — cold but active`);
    } else if (tempF > 55 && tempF <= 65) {
      tempScore = Math.round(20 - ((tempF - 55) / 10) * 15);
      details.push(`Water ${tempF}°F — warm end of range`);
    } else if (tempF < 33) {
      tempScore = 4;
      details.push(`Water ${tempF}°F — near freezing, sluggish fish`);
    } else {
      tempScore = 0;
      details.push(`Water ${tempF}°F — too warm for salmon and steelhead`);
    }
  } else {
    tempScore = 10; // unknown — give half credit
  }

  // ── Season score (0-15) ──────────────────────────────────────────
  const month = now.getMonth() + 1;
  const seasonScore = getSeasonScore(month);
  const seasonLabel = getSeasonLabel(month);
  if (seasonLabel) details.push(seasonLabel);

  // ── Precipitation bonus (0-5) ────────────────────────────────────
  let precipBonus = 0;
  if (forecast?.periods?.length) {
    const maxPrecip = Math.max(...forecast.periods.map((p) => p.precipChance ?? 0));
    if (maxPrecip >= 70 && (cfs ?? 0) < river.idealMin) {
      precipBonus = 5;
      details.push(`${maxPrecip}% rain chance — could trigger a run`);
    } else if (maxPrecip >= 50) {
      precipBonus = 3;
      details.push(`${maxPrecip}% rain chance — watch flows`);
    }
  }

  // ── Community reports bonus (-5 to +8) ───────────────────────────
  const { bonus: communityBonus, summary: communitySummary } =
    communityScoreBonus(river.id, allReports);
  if (communitySummary) details.push(`Reports: ${communitySummary}`);

  const raw =
    flowScore + trendResult.score + clarityScore + tempScore +
    seasonScore + precipBonus + communityBonus;
  const score = Math.min(100, Math.max(0, raw));

  // Michigan: no shoulder-month cap — September IS prime Chinook season
  const rawRating = scoreToRating(score, flowStatus);
  const rating = rawRating;
  const label = scoreToLabel(score, flowStatus);
  const emoji = scoreToEmoji(score, flowStatus);

  return {
    score,
    rating,
    label,
    emoji,
    flowScore,
    tempScore,
    clarityScore,
    trendScore: trendResult.score,
    seasonScore,
    precipBonus,
    communityBonus,
    flowStatus,
    trendResult,
    trend,
    clarity,
    communitySummary,
    details,
  };
}

// ── Trend scoring engine (0-25 pts) ──────────────────────────────────
function scoreTrend(gauge: GaugeReading, river: River): TrendResult {
  const { cfs, cfsHistory: history } = gauge;
  const { idealMin, idealMax } = river;

  if (history.length < 4 || cfs === null) {
    return { score: 4, trend: "steady", label: "Trend unknown — not enough data", isPostSpikePrime: false, peakCFS: null, dropFromPeak: 0 };
  }

  // Recent 3-hour trend (last 12 readings at 15-min intervals)
  const recent = history.slice(-12);
  const recentFirst = recent[0].value;
  const recentLast = recent[recent.length - 1].value;
  const recentPct = recentFirst > 0 ? (recentLast - recentFirst) / recentFirst : 0;

  // 48-hour peak — highest point in the whole history window
  const peakCFS = Math.max(...history.map((h) => h.value));
  const dropFromPeak = peakCFS > 0 ? (peakCFS - cfs) / peakCFS : 0;

  const isFalling = recentPct < -0.04;
  const isFallingFast = recentPct < -0.12;
  const isRising = recentPct > 0.06;
  const isRisingFast = recentPct > 0.15;

  // "Had a spike" = 48h peak was at least 40% higher than current reading
  const hadSpike = peakCFS > cfs * 1.4;

  // River is still elevated (above or near the ideal fishing window)
  const isElevated = cfs > idealMin * 0.8;
  const isHigh = cfs > idealMax;
  const isInRange = cfs >= idealMin && cfs <= idealMax;

  // ── THE PRIME SCENARIO: dropping off a confirmed spike ────────────
  // River blew out, peaked, and is now falling back. Fish pushed in on
  // high water and are most active as flows recede.
  if (hadSpike && isFalling && dropFromPeak > 0.2 && isElevated) {
    if (isInRange) {
      // Dropping into the ideal window from above — the sweet spot
      return {
        score: 25,
        trend: "falling",
        label: `On the drop into prime range — fish active (was ${Math.round(peakCFS).toLocaleString()} CFS)`,
        isPostSpikePrime: true,
        peakCFS,
        dropFromPeak,
      };
    }
    if (isHigh && isFallingFast) {
      return {
        score: 23,
        trend: "falling",
        label: `Dropping fast from ${Math.round(peakCFS).toLocaleString()} CFS spike — fish becoming active as it clears`,
        isPostSpikePrime: true,
        peakCFS,
        dropFromPeak,
      };
    }
    if (isHigh) {
      return {
        score: 21,
        trend: "falling",
        label: `Coming down from ${Math.round(peakCFS).toLocaleString()} CFS — prime window opening`,
        isPostSpikePrime: true,
        peakCFS,
        dropFromPeak,
      };
    }
    // Below ideal but dropping from spike — fish settled but still active
    return {
      score: 18,
      trend: "falling",
      label: `Falling after spike — fish settling in after the push`,
      isPostSpikePrime: true,
      peakCFS,
      dropFromPeak,
    };
  }

  // ── High and dropping (no confirmed spike in window, but trend is down) ──
  if (isFalling && isHigh) {
    return {
      score: 16,
      trend: "falling",
      label: "Falling from high — conditions improving, fish becoming active",
      isPostSpikePrime: false,
      peakCFS,
      dropFromPeak,
    };
  }

  // ── Normal dropping ───────────────────────────────────────────────
  if (isFallingFast) {
    return {
      score: 13,
      trend: "falling",
      label: "Dropping quickly — fish may be running",
      isPostSpikePrime: false,
      peakCFS,
      dropFromPeak,
    };
  }
  if (isFalling) {
    return {
      score: 10,
      trend: "falling",
      label: "Slowly falling — conditions gradually improving",
      isPostSpikePrime: false,
      peakCFS,
      dropFromPeak,
    };
  }

  // ── Rising ────────────────────────────────────────────────────────
  if (isRisingFast) {
    return {
      score: 5,
      trend: "rising",
      label: "Rising fast — fish moving in, but water may muddy up",
      isPostSpikePrime: false,
      peakCFS,
      dropFromPeak,
    };
  }
  if (isRising) {
    return {
      score: 8,
      trend: "rising",
      label: "Rising — fish pushing into the river",
      isPostSpikePrime: false,
      peakCFS,
      dropFromPeak,
    };
  }

  // ── Steady ────────────────────────────────────────────────────────
  return {
    score: 5,
    trend: "steady",
    label: isInRange ? "Steady in prime range" : "Steady",
    isPostSpikePrime: false,
    peakCFS,
    dropFromPeak,
  };
}

function getSeasonScore(month: number): number {
  // Michigan salmon + steelhead calendar:
  //   Aug: early Chinook  Sep: Chinook peak  Oct: all species
  //   Nov: Coho/steelhead  Dec-Feb: winter steelhead
  //   Mar-Apr: peak spring steelhead  May: late steelhead
  //   Jun-Jul: off season
  const scores: Record<number, number> = {
    1: 8,  2: 9,  3: 13, 4: 15, 5: 8,
    6: 2,  7: 0,  8: 8,  9: 12, 10: 15, 11: 13, 12: 10,
  };
  return scores[month] ?? 0;
}

function getSeasonLabel(month: number): string | null {
  if (month === 10)      return "Peak salmon and steelhead run";
  if (month === 9)       return "Chinook salmon running strong";
  if (month === 11)      return "Coho salmon — steelhead building";
  if ([3, 4].includes(month)) return "Peak spring steelhead run";
  if ([12, 1, 2].includes(month)) return "Winter steelhead";
  if (month === 5)       return "Late spring steelhead";
  if (month === 8)       return "Early Chinook — first fish entering";
  if (month === 6)       return "Season winding down";
  return null;
}

function scoreToRating(score: number, flowStatus: string): PredictionResult["rating"] {
  if (flowStatus === "Blown out") return "blown-out";
  if (score === 0 && !flowStatus) return "no-data";
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 35) return "fair";
  return "poor";
}

function scoreToLabel(score: number, flowStatus: string): string {
  if (flowStatus === "Blown out") return "Blown Out";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 35) return "Fair";
  if (score >= 15) return "Poor";
  return "Off Season";
}

function scoreToEmoji(score: number, flowStatus: string): string {
  if (flowStatus === "Blown out") return "🔴";
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  if (score >= 35) return "🟠";
  return "🔴";
}
