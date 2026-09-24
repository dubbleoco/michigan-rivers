import { Fish, AlertTriangle } from "lucide-react";
import RiverCard from "@/components/RiverCard";
import AlleySummary from "@/components/AlleySummary";
import SocialPanel from "@/components/SocialPanel";
import ReportSubmitForm from "@/components/ReportSubmitForm";
import MobileTabLayout from "@/components/MobileTabLayout";
import MobileRiverStrip from "@/components/MobileRiverStrip";
import { generateSocialPost, generateWeeklyOutlook } from "@/lib/social";
import { predict } from "@/lib/prediction";
import { fetchUSGS } from "@/lib/usgs";
import { fetchNWSForecast } from "@/lib/nws";
import { fetchRedditReports, getUserReports } from "@/lib/reports";
import { fetchExternalReports } from "@/lib/external-reports";
import { RIVERS } from "@/lib/rivers";

export const revalidate = 900;

async function getData() {
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
      const reports = allReports.filter((r) => r.riverIds.includes(river.id)).slice(0, 6);
      return { river, gauge, forecast, prediction, reports };
    });

    const summaries = results.map(({ river, gauge, prediction }) => ({ river, gauge, prediction }));
    const daily = generateSocialPost(summaries);
    const weekly = generateWeeklyOutlook(summaries);

    return { results, daily, weekly, updatedAt: new Date().toISOString(), error: null };
  } catch (e: any) {
    return { results: [], daily: "", weekly: "", updatedAt: new Date().toISOString(), error: e.message };
  }
}

export default async function Home() {
  const { results, daily, weekly, updatedAt, error } = await getData();
  const sorted = [...results].sort((a, b) => b.prediction.score - a.prediction.score);

  const errorBanner = error ? (
    <div className="flex items-center gap-3 bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-300 mb-4">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div>
        <div className="font-semibold text-sm">Data fetch error</div>
        <div className="text-xs opacity-80">{error}</div>
      </div>
    </div>
  ) : null;

  /* ── Shared sections ───────────────────────────────────────────── */

  const riverCards = (
    <>
      {errorBanner}
      {sorted.map(({ river, gauge, forecast, prediction, reports }) => (
        <RiverCard
          key={river.id}
          river={river}
          gauge={gauge}
          forecast={forecast}
          prediction={prediction}
          reports={reports}
        />
      ))}
      {results.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500">Loading river data…</div>
      )}
    </>
  );

  const sidebarContent = (
    <div className="space-y-4">
      <SocialPanel daily={daily} weekly={weekly} />
      <ReportSubmitForm rivers={RIVERS} />
      <ScoreGuide />
      <PredictionFactors />
    </div>
  );

  const infoContent = (
    <div className="space-y-4">
      <ScoreGuide />
      <PredictionFactors />
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">About</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Michigan Rivers covers 9 west and northern Michigan tributaries where Chinook salmon,
          Coho salmon, and steelhead run from August through April. Scores combine live USGS gauge
          data, NWS weather forecasts, and community reports updated every 15 minutes.
        </p>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Data: USGS Water Services · NOAA/NWS · Orvis · Michigan DNR
        </p>
      </div>
    </div>
  );

  const summaryStrip = results.length > 0 ? (
    <AlleySummary predictions={results.map((r) => r.prediction)} updatedAt={updatedAt} />
  ) : null;

  /* ── Desktop: full 3-col layout (hidden on mobile) ─────────────── */
  const desktopLayout = (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {error && errorBanner}
      {results.length > 0 && summaryStrip}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {riverCards}
        </div>
        <div className="space-y-4">{sidebarContent}</div>
      </div>
    </div>
  );

  /* ── Mobile: compact strip + scrollable cards (shown on mobile) ─ */
  const mobileRiversTab = (
    <>
      {results.length > 0 && (
        <MobileRiverStrip
          items={results.map(({ river, gauge, prediction }) => ({ river, gauge, prediction }))}
        />
      )}
      <div className="space-y-2">{riverCards}</div>
    </>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Fish className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">
              Michigan Rivers
            </h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">
              Salmon &amp; steelhead conditions
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400 hidden sm:block">Live</span>
          </div>
        </div>
      </header>

      {/* Mobile tabbed layout / desktop passthrough */}
      <MobileTabLayout
        summary={summaryStrip}
        rivers={mobileRiversTab}
        social={<SocialPanel daily={daily} weekly={weekly} />}
        report={<ReportSubmitForm rivers={RIVERS} alwaysOpen />}
        info={infoContent}
      />

      {/* Desktop layout */}
      <div className="hidden md:block">{desktopLayout}</div>

      <footer className="hidden md:block border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        <p>Data: USGS Water Services · NOAA/NWS · Orvis · Michigan DNR · Updated every 15 min</p>
        <p className="mt-1">Not a substitute for local knowledge — always check conditions before you go</p>
      </footer>
    </main>
  );
}

/* ── Shared static sections ─────────────────────────────────────────── */

function ScoreGuide() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Score Guide</h3>
      <div className="space-y-2 text-xs">
        {[
          { emoji: "🟢", range: "80–100", label: "Excellent" },
          { emoji: "🟡", range: "60–79", label: "Good" },
          { emoji: "🟠", range: "35–59", label: "Fair" },
          { emoji: "🔴", range: "0–34", label: "Poor/Blown" },
        ].map((r) => (
          <div key={r.range} className="flex items-center gap-2">
            <span className="text-base leading-none">{r.emoji}</span>
            <span className="text-gray-200 font-medium">{r.label}</span>
            <span className="text-gray-500">({r.range})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionFactors() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Prediction Factors</h3>
      <div className="space-y-1.5 text-xs">
        {[
          { label: "Flow vs Ideal Range", pts: "30 pts" },
          { label: "Flow Trend / Spike Drop", pts: "25 pts" },
          { label: "Water Temperature", pts: "20 pts" },
          { label: "Season", pts: "15 pts" },
          { label: "Water Clarity", pts: "10 pts" },
          { label: "Precip Outlook", pts: "5 pts" },
          { label: "Community Reports", pts: "±12 pts" },
        ].map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-2">
            <span className="text-gray-400">{f.label}</span>
            <span className="text-gray-500 font-mono">{f.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
