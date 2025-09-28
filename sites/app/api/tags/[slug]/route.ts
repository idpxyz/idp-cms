import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const size = searchParams.get("size") || "20";
    const page = searchParams.get("page") || "1";
    const site = searchParams.get("site") || getMainSite().hostname;

    const { slug } = await params;
    const djangoUrlObj = new URL(endpoints.getCmsEndpoint(`/api/tags/${slug}/`));
    djangoUrlObj.searchParams.set("size", size);
    djangoUrlObj.searchParams.set("page", page);
    djangoUrlObj.searchParams.set("site", site);

    const response = await fetch(
      djangoUrlObj.toString(),
      endpoints.createFetchConfig({ method: "GET", next: { revalidate: 30 } })
    );
    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Tag articles backend error" },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("Tag articles proxy error:", err);
    return NextResponse.json({ success: false, message: "Tag articles backend unavailable" }, { status: 503 });
  }
}


