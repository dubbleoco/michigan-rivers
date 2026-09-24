import type { FishingReport } from "./reports";
import { extractSentiment } from "./reports";

// ── Helpers ───────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMainText(html: string, selector = "main"): string {
  const tagMatch = html.match(new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, "i"));
  return stripHtml(tagMatch ? tagMatch[1] : html);
}

async function safeFetch(
  url: string,
  opts: RequestInit & { next?: { revalidate?: number } } = {}
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "User-Agent": "MichiganRivers/1.0 fishing-conditions-aggregator",
        Accept: "text/html,application/xhtml+xml",
        ...((opts.headers as Record<string, string>) ?? {}),
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Orvis per-river Michigan fishing reports ──────────────────────────
// Server-rendered for these rivers (checked Aug 2026)
const ORVIS_RIVERS: { riverId: string; path: string }[] = [
  { riverId: "muskegon",       path: "midwest/michigan/muskegon-river" },
  { riverId: "pere-marquette", path: "midwest/michigan/pere-marquette-river" },
  { riverId: "manistee",       path: "midwest/michigan/manistee-river" },
  { riverId: "boardman",       path: "midwest/michigan/boardman-river" },
  { riverId: "little-manistee",path: "midwest/michigan/little-manistee-river" },
  { riverId: "platte",         path: "midwest/michigan/platte-river" },
];

export async function fetchOrvisReports(): Promise<FishingReport[]> {
  const results: FishingReport[] = [];

  await Promise.all(
    ORVIS_RIVERS.map(async ({ riverId, path }) => {
      const url = `https://fishingreports.orvis.com/${path}`;
      const html = await safeFetch(url, { next: { revalidate: 3600 * 12 } } as any);
      if (!html) return;

      const text = extractMainText(html, "main");

      const outlookMatch = text.match(/5-Day Outlook as of ([\d/]+)\s*([\s\S]+?)(?=Techniques|Local Species|Orvis|$)/i);
      const tipsMatch    = text.match(/Techniques & Tips as of ([\d/]+)\s*([\s\S]+?)(?=Local Species|Orvis|$)/i);

      const datePart = outlookMatch?.[1] ?? tipsMatch?.[1] ?? "";
      const outlook  = outlookMatch?.[2]?.trim().slice(0, 250) ?? "";
      const tips     = tipsMatch?.[2]?.trim().slice(0, 200) ?? "";

      const body = [outlook, tips].filter(Boolean).join(" | ").slice(0, 400);
      if (!body) return;

      const full = text.slice(0, 800);
      const sentiment = extractSentiment(full);

      results.push({
        id: `orvis_${riverId}_${datePart.replace(/\//g, "-")}`,
        riverIds: [riverId],
        source: "orvis",
        author: "Orvis Fishing Reports",
        title: `Orvis${datePart ? ` as of ${datePart}` : ""}`,
        body,
        url,
        // Orvis "as of" dates are often months stale — use fetch time so the report
        // always falls within the scoring window while conditions text is still current
        timestamp: new Date().toISOString(),
        sentiment,
      });
    })
  );

  return results;
}


// ── Baldwin Bait & Tackle (Pere Marquette River guide shop) ──────────
// Uses RSS feed — updated daily during fishing season
export async function fetchFishBaldwinReport(): Promise<FishingReport[]> {
  const feedUrl = "https://fishbaldwin.com/feed/";
  const xml = await safeFetch(feedUrl, { next: { revalidate: 3600 * 6 } } as any);
  if (!xml) return [];

  // Grab first <item> (most recent post)
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
  if (!itemMatch) return [];
  const item = itemMatch[1];

  const titleRaw = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? "";
  const pubDate  = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ?? "";
  const linkRaw  = item.match(/<link>(https?:\/\/[^\s<]+)<\/link>/i)?.[1] ?? feedUrl;
  const descRaw  = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] ?? "";

  const body = stripHtml(descRaw).slice(0, 500).trim();
  if (body.length < 30) return [];

  const sentiment = extractSentiment(body);

  return [
    {
      id: `fishbaldwin_${pubDate.replace(/\s+/g, "_").slice(0, 20) || Date.now()}`,
      riverIds: ["pere-marquette"],
      source: "localshop" as any,
      author: "Baldwin Bait & Tackle",
      title: `BBT Pere Marquette — ${titleRaw.trim() || pubDate}`,
      body,
      url: linkRaw,
      timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sentiment,
    },
  ];
}

// ── Premier Angling Guide Service (Manistee River) ────────────────────
// Single-page report updated regularly; article tag holds the main content
export async function fetchPremierAnglingReport(): Promise<FishingReport[]> {
  const url = "https://premieranglingguideservice.com/fishing-report.html";
  const html = await safeFetch(url, { next: { revalidate: 3600 * 12 } } as any);
  if (!html) return [];

  const text = extractMainText(html, "article");
  if (!text || text.length < 100) return [];

  // Date like "September 20th" — year may be absent
  const dateMatch = text.match(/(\w+ \d+(?:st|nd|rd|th)?,?\s*\d{4})/i)
    ?? text.match(/(\w+ \d+(?:st|nd|rd|th)?)/i);
  const reportDate = dateMatch ? dateMatch[1] : "";

  const snippet = text.slice(0, 500).trim();
  const sentiment = extractSentiment(text);

  return [
    {
      id: `premierangling_${reportDate.replace(/\s+/g, "_") || Date.now()}`,
      riverIds: ["manistee"],
      source: "localshop" as any,
      author: "Premier Angling Guide Service",
      title: `Premier Angling Report${reportDate ? ` — ${reportDate}` : ""}`,
      body: snippet,
      url,
      timestamp: new Date().toISOString(),
      sentiment,
    },
  ];
}

// ── Aggregate all external sources ───────────────────────────────────
export async function fetchExternalReports(): Promise<FishingReport[]> {
  const [orvis, fishbaldwin, premierangling] = await Promise.allSettled([
    fetchOrvisReports(),
    fetchFishBaldwinReport(),
    fetchPremierAnglingReport(),
  ]);

  return [
    ...(orvis.status          === "fulfilled" ? orvis.value          : []),
    ...(fishbaldwin.status    === "fulfilled" ? fishbaldwin.value    : []),
    ...(premierangling.status === "fulfilled" ? premierangling.value : []),
  ];
}
