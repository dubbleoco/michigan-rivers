import { RIVERS } from "./rivers";

export type ReportRating = "excellent" | "good" | "fair" | "poor";
export type ReportSentiment = "positive" | "negative" | "neutral";
export type ReportSource = "reddit" | "user" | "nydec" | "orvis" | "mdnr" | "localshop";

export interface FishingReport {
  id: string;
  riverIds: string[];   // which rivers this mentions
  source: ReportSource;
  author: string;
  title: string;
  body: string;         // snippet / text
  url?: string;
  timestamp: string;
  rating?: ReportRating;    // user-submitted explicit rating
  sentiment: ReportSentiment; // derived from text
  upvotes?: number;
}

// ── Sentiment extraction ─────────────────────────────────────────────
const POSITIVE = [
  // general angling success
  "limit", "limits", "on fire", "crushing", "stacked", "excellent", "great",
  "hot fishing", "loaded", "wide open", "hammered", "killing it", "slaying",
  "found them", "productive", "tight lines", "good fishing", "fish on",
  "lots of", "plenty", "had a blast", "nailing", "smoking", "dialed in",
  "smashing", "doubled", "tripled", "personal best", "grip and grin",
  // salmon/steelhead-specific
  "kings in", "chinook in", "salmon in", "coho in", "steelhead in",
  "fish are in", "fish in the system", "fish are running", "fish are moving",
  "fish are active", "fish are showing", "fish have been", "fish entering",
  "on the move", "piling up", "stacked up", "running strong", "good numbers",
  "seeing fish", "fresh fish", "bright fish", "chrome", "good action",
  "entering the system", "new fish", "active bite", "good bite",
  "fish are there", "fish are here", "fish have entered", "season underway",
  "fishing has been good", "fishing has been great", "fishing well",
  "fish are being caught", "fish caught", "wonderful",
];
const NEGATIVE = [
  "skunked", "slow", "tough fishing", "shutout", "blanked",
  "gave up", "not biting", "no luck", "not worth", "blown out",
  "wasted trip", "zero", "no fish", "couldn't buy a bite",
  "not eating", "shut down", "muddy", "chocolate milk",
  "no kings", "no salmon", "no steelhead", "not seeing fish",
  "haven't seen fish", "fish haven't", "nothing moving", "not much happening",
];

export function extractSentiment(text: string): ReportSentiment {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (lower.includes(w)) score++;
  for (const w of NEGATIVE) if (lower.includes(w)) score--;
  return score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
}

// ── River name matching ───────────────────────────────────────────────
const RIVER_ALIASES: Record<string, string[]> = {
  "muskegon":      ["muskegon"],
  "rogue":         ["rogue river", "rogue r."],
  "whiterivier":   ["white river", "white r."],
  "pere-marquette":["pere marquette", "pm river", "p.m.", "p.m. river"],
  "little-manistee":["little manistee", "little manny", "little man"],
  "manistee":      ["manistee river", "big manistee"],
  "platte":        ["platte river", "platte r."],
  "boardman":      ["boardman river", "boardman r."],
  "jordan":        ["jordan river", "jordan r."],
};

export function detectRivers(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [id, aliases] of Object.entries(RIVER_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) found.push(id);
  }
  // Generic michigan river / great lakes tribs → tag main rivers
  if (
    found.length === 0 &&
    (lower.includes("michigan river") || lower.includes("great lakes") || lower.includes("lake michigan tribu"))
  ) {
    found.push("muskegon", "pere-marquette", "manistee");
  }
  return found.length > 0 ? found : [];
}

// ── Reddit fetcher ────────────────────────────────────────────────────
const SUBREDDITS = ["MichiganFishing", "flyfishing", "FlyFishing", "fishing"];

export async function fetchRedditReports(): Promise<FishingReport[]> {
  const results: FishingReport[] = [];
  const seen = new Set<string>();

  const queries = [
    { q: "michigan salmon steelhead river", t: "week" },
    { q: "pere marquette muskegon manistee", t: "month" },
  ];

  for (const { q, t } of queries) {
    for (const sub of SUBREDDITS.slice(0, 2)) { // limit to top 2 to avoid rate limits
      try {
        const url =
          `https://www.reddit.com/r/${sub}/search.json` +
          `?q=${encodeURIComponent(q)}&sort=new&t=${t}&limit=8&restrict_sr=1`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": "SteelheadAlley/1.0 fishing-conditions-app",
            Accept: "application/json",
          },
          next: { revalidate: 3600 }, // cache 1 hour
        });

        if (!res.ok) continue;
        const data = await res.json();

        for (const child of data?.data?.children ?? []) {
          const p = child.data;
          if (seen.has(p.id)) continue;
          seen.add(p.id);

          const fullText = `${p.title} ${p.selftext ?? ""}`;
          const riverIds = detectRivers(fullText);
          if (riverIds.length === 0) continue; // skip if no river match

          const body = p.selftext
            ? p.selftext.slice(0, 280).replace(/\n+/g, " ").trim()
            : "";

          results.push({
            id: `reddit_${p.id}`,
            riverIds,
            source: "reddit",
            author: `u/${p.author}`,
            title: p.title,
            body,
            url: `https://reddit.com${p.permalink}`,
            timestamp: new Date(p.created_utc * 1000).toISOString(),
            sentiment: extractSentiment(fullText),
            upvotes: p.ups,
          });
        }
      } catch {
        // continue on error — don't let Reddit failures break the app
      }
    }
  }

  // Sort newest first
  return results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ── In-memory user report store ───────────────────────────────────────
// In production replace with a database (SQLite, Postgres, etc.)
const USER_REPORTS: FishingReport[] = [];

export function submitUserReport(input: {
  riverIds: string[];
  author: string;
  title: string;
  body: string;
  rating: ReportRating;
}): FishingReport {
  const report: FishingReport = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    riverIds: input.riverIds,
    source: "user",
    author: input.author,
    title: input.title,
    body: input.body,
    timestamp: new Date().toISOString(),
    rating: input.rating,
    sentiment: ratingToSentiment(input.rating),
  };
  USER_REPORTS.unshift(report);
  return report;
}

export function getUserReports(riverId?: string): FishingReport[] {
  const reports = USER_REPORTS.slice(0, 50); // last 50
  return riverId ? reports.filter((r) => r.riverIds.includes(riverId)) : reports;
}

function ratingToSentiment(rating: ReportRating): ReportSentiment {
  if (rating === "excellent" || rating === "good") return "positive";
  if (rating === "poor") return "negative";
  return "neutral";
}

// ── Score bonus from recent community reports (0-8 pts) ──────────────
export function communityScoreBonus(
  riverId: string,
  allReports: FishingReport[]
): { bonus: number; summary: string | null } {
  // External sources (orvis, metroparks, fisherie, nydec) update weekly — use 14-day window.
  // Reddit and user reports are near real-time — 48h is fine, but 14 days doesn't hurt them.
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent = allReports.filter(
    (r) => r.riverIds.includes(riverId) && new Date(r.timestamp).getTime() > cutoff
  );

  if (recent.length === 0) return { bonus: 0, summary: null };

  let pos = 0, neg = 0;
  for (const r of recent) {
    if (r.sentiment === "positive") pos++;
    else if (r.sentiment === "negative") neg--;
  }

  const net = pos + neg; // net positive reports
  const bonus = Math.max(-8, Math.min(12, net * 3)); // ±pts based on net sentiment

  const summary =
    recent.length === 1
      ? `1 recent report (${recent[0].sentiment})`
      : `${recent.length} recent reports — ${pos} positive, ${Math.abs(neg)} negative`;

  return { bonus, summary };
}
