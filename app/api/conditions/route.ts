import { NextResponse } from "next/server";
import { RIVERS } from "@/lib/rivers";
import { fetchUSGS } from "@/lib/usgs";
import { fetchNWSForecast } from "@/lib/nws";
import { predict } from "@/lib/prediction";
import { fetchRedditReports, getUserReports } from "@/lib/reports";
import { fetchExternalReports } from "@/lib/external-reports";

export const revalidate = 900;

export async function GET() {
  try {
    const siteIds = RIVERS.map((r) => r.siteId);

    const [usgsData, redditReports, externalReports, ...forecasts] = await Promise.all([
      fetchUSGS(siteIds),
      fetchRedditReports(),
      fetchExternalReports(),
      ...RIVERS.map((r) => fetchNWSForecast(r.coords[0], r.coords[1])),
    ]);

    const allReports = [...getUserReports(), ...redditReports, ...externalReports];

    const results = RIVERS.map((river, i) => {
      const gauge = usgsData[river.siteId] ?? {
        siteId: river.siteId,
        siteName: river.name,
        datetime: "",
        cfs: null,
        gaugeFt: null,
        waterTempC: null,
        waterTempF: null,
        turbidityNTU: null,
        cfsHistory: [],
      };
      const forecast = forecasts[i];
      const prediction = predict(river, gauge, forecast, allReports);
      const riverReports = allReports.filter((r) => r.riverIds.includes(river.id));

      return { river, gauge, forecast, prediction, reports: riverReports.slice(0, 5) };
    });

    return NextResponse.json({ updatedAt: new Date().toISOString(), results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
