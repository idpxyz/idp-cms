import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const size = searchParams.get("size") || "30";
    const site = searchParams.get("site") || getMainSite().hostname;

    const djangoUrlObj = new URL(endpoints.getCmsEndpoint("/api/tags/top/"));
    djangoUrlObj.searchParams.set("size", size);
    djangoUrlObj.searchParams.set("site", site);

    const response = await fetch(
      djangoUrlObj.toString(),
      endpoints.createFetchConfig({ method: "GET", next: { revalidate: 60 } })
    );
    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Tags backend error" },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("Tags top proxy error:", err);
    return NextResponse.json({ success: false, message: "Tags backend unavailable" }, { status: 503 });
  }
}


