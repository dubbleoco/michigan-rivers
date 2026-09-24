#!/usr/bin/env npx tsx
/**
 * post-conditions.ts
 * Fetch current Steelhead Alley conditions and post to social media.
 *
 * Usage:
 *   npx tsx scripts/post-conditions.ts --dry-run        # print post, don't send
 *   npx tsx scripts/post-conditions.ts --type weekly    # weekly outlook
 *   npx tsx scripts/post-conditions.ts --type daily     # daily update (default)
 *
 * Required env vars for posting (add to .env.local):
 *   TWITTER_BEARER_TOKEN
 *   TWITTER_API_KEY / TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN / TWITTER_ACCESS_SECRET
 *   (Facebook/Instagram: FB_PAGE_TOKEN, FB_PAGE_ID)
 *
 * Cron example (6am and 4pm daily):
 *   0 6,16 * * * cd /path/to/steelhead-alley && npx tsx scripts/post-conditions.ts
 */

import { RIVERS } from "../lib/rivers";
import { fetchUSGS } from "../lib/usgs";
import { fetchNWSForecast } from "../lib/nws";
import { predict } from "../lib/prediction";
import { generateSocialPost, generateWeeklyOutlook, RiverSummary } from "../lib/social";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const typeArg = args.indexOf("--type");
  const type: "daily" | "weekly" = typeArg !== -1 && args[typeArg + 1] === "weekly" ? "weekly" : "daily";

  console.log(`\n🎣 Steelhead Alley — ${type.toUpperCase()} post`);
  console.log(`   Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log("─".repeat(50));

  // Fetch data
  console.log("Fetching USGS gauge data...");
  const siteIds = RIVERS.map((r) => r.siteId);
  const [usgsData, ...forecasts] = await Promise.all([
    fetchUSGS(siteIds),
    ...RIVERS.map((r) => fetchNWSForecast(r.coords[0], r.coords[1])),
  ]);

  const summaries: RiverSummary[] = RIVERS.map((river, i) => {
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

  const post = type === "weekly" ? generateWeeklyOutlook(summaries) : generateSocialPost(summaries);

  console.log("\nGenerated post:\n");
  console.log(post);
  console.log("\n" + "─".repeat(50));
  console.log(`Characters: ${post.length}`);

  if (isDryRun) {
    console.log("\n[DRY RUN] Skipping social media posting.\n");
    return;
  }

  // ── Twitter/X ────────────────────────────────────────────────────
  if (process.env.TWITTER_BEARER_TOKEN && process.env.TWITTER_API_KEY) {
    console.log("\nPosting to Twitter/X...");
    await postToTwitter(post);
  } else {
    console.log("\n[SKIP] Twitter: no API credentials in env.");
  }

  // ── Facebook ─────────────────────────────────────────────────────
  if (process.env.FB_PAGE_TOKEN && process.env.FB_PAGE_ID) {
    console.log("Posting to Facebook...");
    await postToFacebook(post);
  } else {
    console.log("[SKIP] Facebook: no page token in env.");
  }

  console.log("\n✅ Done\n");
}

async function postToTwitter(text: string) {
  // Twitter API v2 — requires OAuth 1.0a user-context for posting
  // See: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
  const {
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET,
  } = process.env;

  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    console.error("  Missing Twitter OAuth 1.0a credentials.");
    return;
  }

  // Truncate to 280 chars if needed
  const tweet = text.length > 280 ? text.slice(0, 277) + "..." : text;

  try {
    // Simple OAuth 1.0a header generation
    const oauth = buildOAuthHeader("POST", "https://api.twitter.com/2/tweets", {}, {
      oauth_consumer_key: TWITTER_API_KEY,
      oauth_consumer_secret: TWITTER_API_SECRET,
      oauth_token: TWITTER_ACCESS_TOKEN,
      oauth_token_secret: TWITTER_ACCESS_SECRET,
    });

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: oauth,
      },
      body: JSON.stringify({ text: tweet }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`  ✓ Posted tweet id: ${data.data?.id}`);
    } else {
      const err = await res.text();
      console.error(`  ✗ Twitter error ${res.status}: ${err}`);
    }
  } catch (e) {
    console.error("  ✗ Twitter post failed:", e);
  }
}

async function postToFacebook(text: string) {
  const { FB_PAGE_TOKEN, FB_PAGE_ID } = process.env;
  try {
    const url = `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/feed`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, access_token: FB_PAGE_TOKEN }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`  ✓ Posted to Facebook: ${data.id}`);
    } else {
      const err = await res.text();
      console.error(`  ✗ Facebook error ${res.status}: ${err}`);
    }
  } catch (e) {
    console.error("  ✗ Facebook post failed:", e);
  }
}

// Minimal OAuth 1.0a header builder
function buildOAuthHeader(
  method: string,
  url: string,
  _params: Record<string, string>,
  creds: { oauth_consumer_key: string; oauth_consumer_secret: string; oauth_token: string; oauth_token_secret: string }
): string {
  const nonce = Math.random().toString(36).slice(2);
  const ts = Math.floor(Date.now() / 1000).toString();
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.oauth_consumer_key,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: ts,
    oauth_token: creds.oauth_token,
    oauth_version: "1.0",
  };

  const paramStr = Object.entries(oauthParams)
    .sort()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const baseStr = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramStr),
  ].join("&");

  const signingKey = `${encodeURIComponent(creds.oauth_consumer_secret)}&${encodeURIComponent(creds.oauth_token_secret)}`;

  // Node.js crypto for HMAC-SHA1
  const { createHmac } = require("crypto");
  const sig = createHmac("sha1", signingKey).update(baseStr).digest("base64");

  const authHeader =
    'OAuth ' +
    Object.entries({ ...oauthParams, oauth_signature: sig })
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ");

  return authHeader;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
