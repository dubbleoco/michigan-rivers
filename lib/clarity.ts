import { GaugeReading } from "./usgs";
import { River } from "./rivers";

export interface ClarityResult {
  label: string;         // plain-English one-liner
  detail: string;        // what it means for the angler
  tip: string;           // actionable fly fishing tip
  score: number;         // 0-10 contribution to prediction
  source: "sensor" | "estimated";
  ntu: number | null;    // raw NTU value if available
}

// ── Sensor-based (measured turbidity in NTU/FNU) ──────────────────
// NTU scale for trout streams:
//   0–10    crystal to lightly tinted — spooky fish
//   10–30   slight stain — often prime
//   30–80   stained — fish can still find a fly
//   80–200  murky — hard for fish to see
//   200+    chocolate milk — nearly unfishable for sight
function fromSensor(ntu: number): ClarityResult {
  if (ntu <= 10) {
    return {
      label: "Crystal clear",
      detail: "Water is gin-clear — fish can see everything, including you",
      tip: "Go light: fine tippet, small natural flies, long casts from low angles",
      score: 6,
      source: "sensor",
      ntu,
    };
  }
  if (ntu <= 30) {
    return {
      label: "Slightly stained",
      detail: "Just enough color to give fish confidence without hiding your fly",
      tip: "Prime visibility window — fish are less spooky and can still find your fly",
      score: 10,
      source: "sensor",
      ntu,
    };
  }
  if (ntu <= 80) {
    return {
      label: "Stained",
      detail: "Water has color from recent runoff — fish can still locate flies",
      tip: "Size up and brighten: try chartreuse, orange, or larger egg patterns",
      score: 7,
      source: "sensor",
      ntu,
    };
  }
  if (ntu <= 200) {
    return {
      label: "Murky",
      detail: "High sediment load — fish struggle to see more than a few inches",
      tip: "Go big and bright: large streamers, heavy tungsten beads, vibrant colors",
      score: 3,
      source: "sensor",
      ntu,
    };
  }
  return {
    label: "Chocolate",
    detail: "Nearly zero visibility — water looks like chocolate milk",
    tip: "Wait for flows to drop — conditions will improve as the river clears",
    score: 0,
    source: "sensor",
    ntu,
  };
}

// ── Estimated clarity from flow behavior ─────────────────────────
// When no turbidity sensor exists at the gauge, we estimate from
// flow trend and level vs ideal range — a standard angler heuristic.
function estimateFromFlow(gauge: GaugeReading, river: River): ClarityResult {
  const { cfs, cfsHistory } = gauge;
  const { idealMin, idealMax } = river;

  if (cfs === null) {
    return {
      label: "Unknown",
      detail: "No flow data — clarity cannot be estimated",
      tip: "Check local reports before heading out",
      score: 5,
      source: "estimated",
      ntu: null,
    };
  }

  // Compute trend from last 12 readings (~3 hours of 15-min data)
  let pctChange = 0;
  if (cfsHistory.length >= 4) {
    const recent = cfsHistory.slice(-12);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    pctChange = first > 0 ? (last - first) / first : 0;
  }

  const isRisingFast = pctChange > 0.15;  // >15% rise = runoff likely muddying
  const isRising = pctChange > 0.05;
  const isFalling = pctChange < -0.05;
  const isFallingFast = pctChange < -0.15;

  const isVeryHigh = cfs > idealMax * 2;
  const isHigh = cfs > idealMax;
  const isLow = cfs < idealMin;

  if (isRisingFast || (isVeryHigh && isRising)) {
    return {
      label: "Muddying up",
      detail: "River is rising fast — runoff is likely coloring the water",
      tip: "Wait — clarity usually improves 12–24 hours after the peak",
      score: 2,
      source: "estimated",
      ntu: null,
    };
  }
  if (isVeryHigh) {
    return {
      label: "Murky (estimated)",
      detail: "Very high flows typically carry heavy sediment",
      tip: "Go large and bright — fish are holding near the bank in the slack",
      score: 3,
      source: "estimated",
      ntu: null,
    };
  }
  if (isHigh && isRising) {
    return {
      label: "Staining",
      detail: "Rising high water is picking up color from the watershed",
      tip: "Chartreuse and orange egg patterns — something fish can find",
      score: 4,
      source: "estimated",
      ntu: null,
    };
  }
  if (isFallingFast && isHigh) {
    return {
      label: "Stained and clearing fast",
      detail: "Coming off a high — water is colored but dropping and improving by the hour",
      tip: "Fish it now — this falling-water window is when steelhead are most active",
      score: 9,
      source: "estimated",
      ntu: null,
    };
  }
  if (isFalling || (isHigh && !isRising)) {
    return {
      label: "Clearing",
      detail: "Flow is dropping and water is clearing from recent color",
      tip: "Classic steelhead window — fish are settling in as visibility improves",
      score: 9,
      source: "estimated",
      ntu: null,
    };
  }
  if (isLow) {
    return {
      label: "Very clear",
      detail: "Low, stable flows run clear — fish can see you easily",
      tip: "Downsize everything: 6X–7X tippet, size 14–18 flies, slow careful wading",
      score: 5,
      source: "estimated",
      ntu: null,
    };
  }
  // In range, steady
  return {
    label: "Clear to lightly stained",
    detail: "Stable flows in a good range — clarity is likely fishable",
    tip: "Standard presentation — match the hatch or run a small egg/nymph",
    score: 8,
    source: "estimated",
    ntu: null,
  };
}

export function getClarity(gauge: GaugeReading, river: River): ClarityResult {
  if (gauge.turbidityNTU !== null) {
    return fromSensor(gauge.turbidityNTU);
  }
  return estimateFromFlow(gauge, river);
}

// Short label for social posts
export function clarityShortLabel(clarity: ClarityResult): string {
  return `${clarity.label}${clarity.source === "estimated" ? "*" : ""}`;
}
