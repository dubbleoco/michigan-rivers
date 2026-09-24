"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Send, CheckCircle, AlertCircle } from "lucide-react";
import type { River } from "@/lib/rivers";

interface Props {
  rivers: River[];
  alwaysOpen?: boolean;
}

type Rating = "excellent" | "good" | "fair" | "poor";

const RATING_LABELS: Record<Rating, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "text-green-400" },
  good: { label: "Good", color: "text-yellow-400" },
  fair: { label: "Fair", color: "text-orange-400" },
  poor: { label: "Poor", color: "text-red-400" },
};

export default function ReportSubmitForm({ rivers, alwaysOpen = false }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedRivers, setSelectedRivers] = useState<string[]>([]);
  const [rating, setRating] = useState<Rating | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleRiver(id: string) {
    setSelectedRivers((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  function reset() {
    setSelectedRivers([]);
    setRating("");
    setTitle("");
    setBody("");
    setStatus("idle");
    setErrorMsg("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ riverIds: selectedRivers, author: author.trim(), title, text: body, rating }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? "Submission failed");
          setStatus("error");
        } else {
          setStatus("success");
          setTimeout(() => {
            reset();
            setOpen(false);
          }, 2500);
        }
      } catch {
        setErrorMsg("Network error — try again");
        setStatus("error");
      }
    });
  }

  const isOpen = alwaysOpen || open;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {!alwaysOpen && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-300 hover:text-white hover:bg-gray-800/40 transition-colors"
        >
          <span className="font-medium">Submit a Fishing Report</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
      {alwaysOpen && (
        <div className="px-4 pt-4 pb-1">
          <h2 className="text-base font-bold text-white">Submit a Fishing Report</h2>
          <p className="text-xs text-gray-400 mt-0.5">Help other anglers — share what you found on the water</p>
        </div>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className={`px-4 pb-4 space-y-3 pt-3 ${!alwaysOpen ? "border-t border-gray-800" : ""}`}>
          {status === "success" ? (
            <div className="flex items-center gap-2 text-green-400 py-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Report submitted — thanks!</span>
            </div>
          ) : (
            <>
              {status === "error" && (
                <div className="flex items-center gap-2 text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{errorMsg}</span>
                </div>
              )}

              {/* River selector */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">River(s) — select all that apply</label>
                <div className="grid grid-cols-2 gap-1">
                  {rivers.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRiver(r.id)}
                      className={`text-xs px-2 py-1.5 rounded-lg text-left transition-colors ${
                        selectedRivers.includes(r.id)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
                {selectedRivers.length === 0 && (
                  <p className="text-xs text-gray-600 mt-1">Select at least one river</p>
                )}
              </div>

              {/* Rating */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">How was the fishing?</label>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(RATING_LABELS) as Rating[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRating(r)}
                      className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${
                        rating === r
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <span className={rating === r ? "text-white" : RATING_LABELS[r].color}>
                        {RATING_LABELS[r].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chagrin was on fire this morning"
                  maxLength={200}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Details (optional)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Flies used, water color, time of day, fish count…"
                  maxLength={500}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Author */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name (optional)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Anonymous"
                  maxLength={50}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || selectedRivers.length === 0 || !rating || !title.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {isPending ? "Submitting…" : "Submit Report"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
