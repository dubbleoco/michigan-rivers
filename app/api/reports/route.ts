import { NextRequest, NextResponse } from "next/server";
import {
  fetchRedditReports,
  getUserReports,
  submitUserReport,
  ReportRating,
} from "@/lib/reports";
import { RIVERS } from "@/lib/rivers";

// GET — fetch all reports (reddit + user-submitted)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const riverId = searchParams.get("river") ?? undefined;

  const [reddit, user] = await Promise.all([
    fetchRedditReports(),
    Promise.resolve(getUserReports(riverId)),
  ]);

  // Merge, filter by river if requested, sort newest first
  let all = [...user, ...reddit];
  if (riverId) {
    all = all.filter((r) => r.riverIds.includes(riverId));
  }
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ reports: all.slice(0, 20), total: all.length });
}

// POST — submit a user report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { riverIds, author, title, text, rating } = body as {
      riverIds: string[];
      author?: string;
      title: string;
      text: string;
      rating: ReportRating;
    };

    // Basic validation
    if (!Array.isArray(riverIds) || riverIds.length === 0) {
      return NextResponse.json({ error: "Select at least one river" }, { status: 400 });
    }
    const validRiverIds = RIVERS.map((r) => r.id);
    if (!riverIds.every((id) => validRiverIds.includes(id))) {
      return NextResponse.json({ error: "Invalid river ID" }, { status: 400 });
    }
    if (!title?.trim() || title.length > 200) {
      return NextResponse.json({ error: "Title required (max 200 chars)" }, { status: 400 });
    }
    if (!["excellent", "good", "fair", "poor"].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const report = submitUserReport({
      riverIds,
      author: author?.slice(0, 50).trim() || "Anonymous",
      title: title.trim(),
      body: (text ?? "").slice(0, 500).trim(),
      rating,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
