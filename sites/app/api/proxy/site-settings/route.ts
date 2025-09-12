import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import {
  isAllowedSite,
  generateRequestId,
} from "@/lib/security/site-validation";

// 指定Node.js runtime，避免edge限制
export const runtime = "nodejs";
export const revalidate = 120;

// URL managed by endpoints service
const PROXY_TIMEOUT = parseInt(process.env.PROXY_TIMEOUT || "4000");

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const site = url.searchParams.get("site") || "";

  // 1. 安全验证：检查站点是否在白名单中
  if (!isAllowedSite(site)) {
    return NextResponse.json(
      { error: "Invalid or unauthorized site" },
      { status: 400 }
    );
  }

  // 2. 构建上游请求URL
  const upstream = new URL("/api/site-settings", endpoints.getCmsEndpoint());
  url.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  try {
    // 3. 发起上游请求（带超时和重试）
    const response = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(PROXY_TIMEOUT),
      headers: {
        "x-request-id": req.headers.get("x-request-id") || generateRequestId(),
        "User-Agent": "IDP-CMS-Proxy/1.0",
      },
      // 让Next.js参与缓存
      next: {
        revalidate: 120,
        tags: [`site:${site}`, "settings:all"],
      },
    });

    // 4. 处理响应
    if (!response.ok) {
      // 透传上游状态码，便于排障
      return NextResponse.json(
        {
          error: `Upstream error: ${response.status}`,
          upstream_status: response.status,
          upstream_time: Date.now(),
        },
        { status: response.status }
      );
    }

    // 5. 获取响应体
    const body = await response.text();

    // 6. 构建响应（透传关键响应头以命中CDN/ISR）
    const out = new NextResponse(body, { status: response.status });

    // 透传缓存相关头部
    const cacheHeaders = [
      "cache-control",
      "etag",
      "surrogate-key",
      "content-type",
    ];
    cacheHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) out.headers.set(header, value);
    });

    // 添加代理标识
    out.headers.set("x-proxy-by", "IDP-CMS-Proxy");
    out.headers.set("x-upstream-status", response.status.toString());

    return out;
  } catch (error) {
    // 7. 错误处理
    console.error(`Proxy error for site ${site}:`, error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          error: "Upstream timeout",
          upstream_time: Date.now(),
          retry_after: 30,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal proxy error",
        upstream_time: Date.now(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // POST方法用于更新站点配置
  const url = new URL(req.url);
  const site = url.searchParams.get("site") || "";

  if (!isAllowedSite(site)) {
    return NextResponse.json(
      { error: "Invalid or unauthorized site" },
      { status: 400 }
    );
  }

  try {
    const body = await req.text();

    const response = await fetch(`${endpoints.getCmsEndpoint()}/api/site-settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": req.headers.get("x-request-id") || generateRequestId(),
      },
      body,
      signal: AbortSignal.timeout(PROXY_TIMEOUT),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Upstream error: ${response.status}`,
          upstream_status: response.status,
        },
        { status: response.status }
      );
    }

    const responseBody = await response.text();
    const out = new NextResponse(responseBody, { status: response.status });

    // 设置缓存失效标签
    out.headers.set("Surrogate-Key", `site:${site} settings:all`);

    return out;
  } catch (error) {
    console.error(`Proxy POST error for site ${site}:`, error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 }
    );
  }
}
