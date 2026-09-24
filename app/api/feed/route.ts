import { NextResponse } from "next/server";
import { RIVERS } from "@/lib/rivers";
import { fetchUSGS } from "@/lib/usgs";
import { fetchNWSForecast } from "@/lib/nws";
import { predict } from "@/lib/prediction";
import { generateSocialPost, generateWeeklyOutlook } from "@/lib/social";

export const revalidate = 900;

export async function GET() {
  const siteIds = RIVERS.map((r) => r.siteId);
  const [usgsData, ...forecasts] = await Promise.all([
    fetchUSGS(siteIds),
    ...RIVERS.map((r) => fetchNWSForecast(r.coords[0], r.coords[1])),
  ]);

  const results = RIVERS.map((river, i) => {
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
    const prediction = predict(river, gauge, forecasts[i]);
    return {
      id: river.id,
      name: river.name,
      state: river.state,
      location: river.location,
      conditions: {
        cfs: gauge.cfs,
        gaugeFt: gauge.gaugeFt,
        waterTempF: gauge.waterTempF,
        updatedAt: gauge.datetime,
      },
      prediction: {
        score: prediction.score,
        rating: prediction.rating,
        label: prediction.label,
        trend: prediction.trend,
        details: prediction.details,
      },
    };
  });

  const summaries = results.map((r, i) => {
    const gauge = usgsData[RIVERS[i].siteId] ?? {
      siteId: RIVERS[i].siteId,
      siteName: RIVERS[i].name,
      datetime: "",
      cfs: null,
      gaugeFt: null,
      waterTempC: null,
      waterTempF: null,
      cfsHistory: [],
    };
    const pred = predict(RIVERS[i], gauge, forecasts[i]);
    return { river: RIVERS[i], gauge, prediction: pred };
  });

  const overall = results.reduce((a, b) => a + b.prediction.score, 0) / (results.length || 1);

  return NextResponse.json(
    {
      meta: {
        updatedAt: new Date().toISOString(),
        source: "USGS Water Services + NOAA/NWS",
        overallScore: Math.round(overall),
        overallRating:
          overall >= 70 ? "hot" : overall >= 50 ? "decent" : overall >= 30 ? "tough" : "off",
      },
      rivers: results,
      social: {
        daily: generateSocialPost(summaries),
        weekly: generateWeeklyOutlook(summaries),
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    }
  );
}
