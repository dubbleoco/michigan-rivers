"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Share2 } from "lucide-react";

interface Props {
  daily: string;
  weekly: string;
}

export default function SocialPanel({ daily, weekly }: Props) {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState({ daily, weekly });

  const text = posts[tab];

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const [d, w] = await Promise.all([
        fetch("/api/social?type=daily").then((r) => r.json()),
        fetch("/api/social?type=weekly").then((r) => r.json()),
      ]);
      setPosts({ daily: d.post, weekly: w.post });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Social Posts</span>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(["daily", "weekly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
              tab === t
                ? "text-blue-400 border-b-2 border-blue-400 bg-blue-400/5"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Post text */}
      <div className="p-4">
        <pre className="text-xs text-gray-200 whitespace-pre-wrap font-sans leading-relaxed bg-gray-800/40 rounded-lg p-3 min-h-[120px]">
          {text}
        </pre>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">{text.length} chars</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
