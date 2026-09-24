import { NextRequest, NextResponse } from "next/server";
import { RIVERS } from "@/lib/rivers";
import { fetchUSGS } from "@/lib/usgs";
import { fetchNWSForecast } from "@/lib/nws";
import { predict } from "@/lib/prediction";
import { generateSocialPost, generateDetailedPost, generateWeeklyOutlook } from "@/lib/social";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "daily"; // daily | detailed | weekly
  const riverId = searchParams.get("river"); // optional river filter

  const targetRivers = riverId ? RIVERS.filter((r) => r.id === riverId) : RIVERS;
  const siteIds = targetRivers.map((r) => r.siteId);

  const [usgsData, ...forecasts] = await Promise.all([
    fetchUSGS(siteIds),
    ...targetRivers.map((r) => fetchNWSForecast(r.coords[0], r.coords[1])),
  ]);

  const summaries = targetRivers.map((river, i) => {
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

  let post: string;
  if (type === "weekly") {
    post = generateWeeklyOutlook(summaries);
  } else if (type === "detailed" && summaries.length === 1) {
    post = generateDetailedPost(summaries[0]);
  } else {
    post = generateSocialPost(summaries);
  }

  return NextResponse.json({ post, type, generatedAt: new Date().toISOString() });
}
