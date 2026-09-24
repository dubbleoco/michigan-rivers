"use client";

import { useState } from "react";
import { Map, Share2, FileEdit, Info } from "lucide-react";

type Tab = "rivers" | "social" | "report" | "info";

interface Props {
  rivers: React.ReactNode;
  social: React.ReactNode;
  report: React.ReactNode;
  info: React.ReactNode;
  summary: React.ReactNode;
}

const TABS: { id: Tab; label: string; icon: typeof Map }[] = [
  { id: "rivers", label: "Rivers", icon: Map },
  { id: "social", label: "Social", icon: Share2 },
  { id: "report", label: "Report", icon: FileEdit },
  { id: "info", label: "Guide", icon: Info },
];

export default function MobileTabLayout({ rivers, social, report, info, summary }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("rivers");

  return (
    <>
      {/* ── Mobile layout only (<md): tabbed sections + bottom nav ── */}
      <div className="md:hidden">
        {/* Sticky overview always visible at top on mobile */}
        <div className="px-4 pt-3 pb-2">{summary}</div>

        {/* Tab panels */}
        <div className="pb-20"> {/* padding for bottom nav */}
          {activeTab === "rivers" && <div className="px-4">{rivers}</div>}
          {activeTab === "social" && <div className="px-4 pt-2">{social}</div>}
          {activeTab === "report" && <div className="px-4 pt-2">{report}</div>}
          {activeTab === "info" && <div className="px-4 pt-2">{info}</div>}
        </div>

        {/* Bottom navigation bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800 safe-area-pb">
          <div className="grid grid-cols-4 h-16">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                    active
                      ? "text-blue-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                  <span className={`leading-none ${active ? "font-semibold" : ""}`}>{label}</span>
                  {active && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-blue-400 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
