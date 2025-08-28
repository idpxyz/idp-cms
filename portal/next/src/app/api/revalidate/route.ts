import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import crypto from 'crypto';

// Webhook 配置
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-key';
const ALLOWED_IPS = process.env.WEBHOOK_ALLOWED_IPS?.split(',') || [
  '127.0.0.1',
  '::1',
];

// 验证 HMAC-SHA256 签名
function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// 验证 IP 白名单
function isAllowedIP(ip: string): boolean {
  return ALLOWED_IPS.includes(ip) || ALLOWED_IPS.includes('*');
}

// 处理缓存失效请求
export async function POST(request: NextRequest) {
  try {
    // 获取客户端 IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

    // 验证 IP 白名单
    if (!isAllowedIP(clientIP)) {
      console.warn(`Webhook rejected: IP ${clientIP} not in whitelist`);
      return NextResponse.json({ error: 'IP not allowed' }, { status: 403 });
    }

    // 获取请求体
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';

    // 验证签名
    if (!verifySignature(body, signature)) {
      console.warn('Webhook rejected: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 解析请求数据
    const data = JSON.parse(body);
    const { event, site, tags, paths, timestamp } = data;

    console.log(`Webhook received: ${event} for site ${site}`);

    // 处理不同的事件类型
    let revalidatedCount = 0;

    try {
      // 按标签失效缓存
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          try {
            await revalidateTag(tag);
            revalidatedCount++;
            console.log(`Revalidated tag: ${tag}`);
          } catch (error) {
            console.error(`Failed to revalidate tag ${tag}:`, error);
          }
        }
      }

      // 按路径失效缓存
      if (paths && Array.isArray(paths)) {
        for (const path of paths) {
          try {
            await revalidatePath(path);
            revalidatedCount++;
            console.log(`Revalidated path: ${path}`);
          } catch (error) {
            console.error(`Failed to revalidate path ${path}:`, error);
          }
        }
      }

      // 特殊事件处理
      switch (event) {
        case 'article_published':
        case 'article_updated':
          // 失效文章相关缓存
          await revalidateTag(`site:${site}`);
          await revalidateTag(`type:article`);
          if (data.article_id) {
            await revalidateTag(`page:${data.article_id}`);
          }
          revalidatedCount += 3;
          break;

        case 'article_unpublished':
        case 'article_deleted':
          // 失效文章相关缓存
          await revalidateTag(`site:${site}`);
          await revalidateTag(`type:article`);
          revalidatedCount += 2;
          break;

        case 'channel_updated':
          // 失效频道相关缓存
          if (data.channel_id) {
            await revalidateTag(`channel:${data.channel_id}`);
            await revalidateTag(`site:${site}`);
            revalidatedCount += 2;
          }
          break;

        case 'region_updated':
          // 失效地区相关缓存
          if (data.region_id) {
            await revalidateTag(`region:${data.region_id}`);
            await revalidateTag(`site:${site}`);
            revalidatedCount += 2;
          }
          break;

        case 'site_settings_updated':
          // 失效站点设置缓存
          await revalidateTag(`site:${site}`);
          await revalidateTag(`type:site`);
          revalidatedCount += 2;
          break;

        case 'bulk_update':
          // 批量更新，失效所有相关缓存
          await revalidateTag(`site:${site}`);
          revalidatedCount++;
          break;
      }

      // 记录成功响应
      const response = {
        success: true,
        message: `Cache revalidation completed for ${event}`,
        revalidated_count: revalidatedCount,
        site,
        event,
        timestamp: new Date().toISOString(),
      };

      console.log(`Webhook completed: ${revalidatedCount} items revalidated`);

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      console.error('Error during cache revalidation:', error);
      return NextResponse.json(
        {
          error: 'Cache revalidation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'cache-revalidation-webhook',
    timestamp: new Date().toISOString(),
    features: [
      'HMAC-SHA256 signature verification',
      'IP whitelist validation',
      'Tag-based cache invalidation',
      'Path-based cache invalidation',
      'Event-driven invalidation',
    ],
  });
}
