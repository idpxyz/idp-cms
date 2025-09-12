/**
 * 缓存失效 Webhook 端点
 *
 * 接收来自 Wagtail 的 webhook 通知，执行精准缓存失效
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { revalidateTag, revalidatePath } from "next/cache";
import {
  CACHE_TAGS,
  REVALIDATION_EVENTS,
  getTagsForEvent,
  validateCacheTag,
  type RevalidationEvent,
} from "@/lib/cache-tags";

// Webhook 事件类型
interface WebhookPayload {
  event: RevalidationEvent;
  site: string;
  entity: "page" | "settings" | "channel" | "region";
  pageId?: string;
  slug?: string;
  channel?: string;
  region?: string;
  timestamp: number;
  signature: string;
  nonce: string;
}

/**
 * 验证 webhook 签名
 */
function verifySignature(payload: Buffer, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.warn("WEBHOOK_SECRET not configured");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature, "hex")
  );
}

/**
 * 验证时间窗口（防止重放攻击）
 */
function verifyTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  return Math.abs(now - timestamp) <= fiveMinutes;
}

/**
 * 执行缓存失效
 */
async function performRevalidation(payload: WebhookPayload): Promise<string[]> {
  const actions: string[] = [];

  try {
    // 1. 总是失效站点级别的缓存
    revalidateTag(`site:${payload.site}`);
    actions.push(`Revalidated site tag: site:${payload.site}`);

    // 2. 根据实体类型失效特定缓存
    switch (payload.entity) {
      case "page":
        if (payload.pageId) {
          revalidateTag(`page:${payload.pageId}`);
          actions.push(`Revalidated page tag: page:${payload.pageId}`);
        }

        if (payload.slug) {
          // 失效具体页面路径
          revalidatePath(`/news/${payload.slug}`);
          revalidatePath(`/${payload.slug}`);
          actions.push(
            `Revalidated paths: /news/${payload.slug}, /${payload.slug}`
          );
        }

        if (payload.channel) {
          revalidateTag(`channel:${payload.channel}`);
          actions.push(`Revalidated channel tag: channel:${payload.channel}`);
        }

        if (payload.region) {
          revalidateTag(`region:${payload.region}`);
          actions.push(`Revalidated region tag: region:${payload.region}`);
        }
        break;

      case "settings":
        // 站点设置更新，失效设置相关缓存
        revalidateTag(`settings:${payload.site}`);
        actions.push(`Revalidated settings tag: settings:${payload.site}`);

        // 失效主页（设置变更可能影响主页显示）
        revalidatePath("/");
        actions.push("Revalidated homepage");
        break;

      case "channel":
        if (payload.channel) {
          revalidateTag(`channel:${payload.channel}`);
          revalidatePath(`/channel/${payload.channel}`);
          actions.push(`Revalidated channel: ${payload.channel}`);
        }
        break;

      case "region":
        if (payload.region) {
          revalidateTag(`region:${payload.region}`);
          revalidatePath(`/region/${payload.region}`);
          actions.push(`Revalidated region: ${payload.region}`);
        }
        break;
    }

    // 3. 根据事件类型执行额外的失效
    if (payload.event === REVALIDATION_EVENTS.PAGE_UNPUBLISH) {
      // 页面下线时，额外失效首页和列表页
      revalidatePath("/");
      revalidatePath("/news");
      actions.push("Revalidated homepage and news list for unpublish");
    }

    if (payload.event === REVALIDATION_EVENTS.SETTINGS_UPDATE) {
      // 设置更新时，失效主页（主题可能已变更）
      revalidatePath("/");
      actions.push("Revalidated homepage for settings update");
    }
  } catch (error) {
    console.error("Error during revalidation:", error);
    actions.push(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return actions;
}

export async function POST(request: NextRequest) {
  try {
    // 读取原始请求体
    const rawBody = Buffer.from(await request.arrayBuffer());

    // 解析 JSON
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // 验证必要字段
    if (
      !payload.signature ||
      !payload.site ||
      !payload.event ||
      !payload.timestamp
    ) {
      return NextResponse.json(
        { error: "Missing required fields: signature, site, event, timestamp" },
        { status: 400 }
      );
    }

    // 验证时间戳
    if (!verifyTimestamp(payload.timestamp)) {
      return NextResponse.json(
        { error: "Request timestamp outside valid window" },
        { status: 401 }
      );
    }

    // 验证签名
    if (!verifySignature(rawBody, payload.signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 执行缓存失效
    const actions = await performRevalidation(payload);

    // 记录日志
    console.log(
      `Webhook processed for site: ${payload.site}, event: ${payload.event}`,
      {
        entity: payload.entity,
        pageId: payload.pageId,
        slug: payload.slug,
        actions: actions.length,
      }
    );

    // 返回成功响应
    return NextResponse.json(
      {
        success: true,
        message: "Cache revalidation completed",
        site: payload.site,
        event: payload.event,
        actions,
        timestamp: new Date().toISOString(),
      },
      {
        status: 202, // Accepted
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "revalidate-webhook",
    timestamp: new Date().toISOString(),
    webhook_secret_configured: !!process.env.WEBHOOK_SECRET,
  });
}

// CORS 支持
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
