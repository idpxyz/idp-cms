import { NextRequest } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";
export const revalidate = 0; // No caching for real-time streams

export async function GET(req: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = req.nextUrl.searchParams;
    const lastEventId = searchParams.get('Last-Event-ID') || '0';
    const lastTs = searchParams.get('last_ts') || '';
    
    console.log(`🔗 SSE代理连接: lastEventId=${lastEventId}, lastTs=${lastTs}`);
    
    // 构建Django SSE URL
    const djangoUrl = new URL(endpoints.getCmsEndpoint('/api/analytics/stream/'));
    if (lastEventId !== '0') {
      djangoUrl.searchParams.set('Last-Event-ID', lastEventId);
    }
    if (lastTs) {
      djangoUrl.searchParams.set('last_ts', lastTs);
    }
    
    console.log(`📡 代理到Django SSE: ${djangoUrl.toString()}`);
    
    // 创建到Django的SSE连接
    const response = await fetch(djangoUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'User-Agent': 'IDP-CMS-Portal-SSE/1.0',
        ...(req.headers.get('Last-Event-ID') && {
          'Last-Event-ID': req.headers.get('Last-Event-ID')!
        })
      },
      // 重要：不设置超时，保持长连接
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Django SSE错误: ${response.status} - ${errorText}`);
      
      // 返回错误SSE流
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = JSON.stringify({
            error: `Upstream SSE error: ${response.status}`,
            details: errorText,
            timestamp: new Date().toISOString()
          });
          
          controller.enqueue(`event: error\n`);
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
        }
      });
      
      return new Response(errorStream, {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
        }
      });
    }

    // 检查响应是否为SSE流
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/event-stream')) {
      console.error(`❌ Django返回非SSE内容: ${contentType}`);
      
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = JSON.stringify({
            error: 'Invalid SSE response from upstream',
            content_type: contentType,
            timestamp: new Date().toISOString()
          });
          
          controller.enqueue(`event: error\n`);
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
        }
      });
      
      return new Response(errorStream, {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    console.log(`✅ Django SSE连接成功，开始流式代理`);

    // 直接转发SSE流
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
        'X-Accel-Buffering': 'no', // Nginx不缓冲
      }
    });
    
  } catch (error) {
    console.error("🚨 SSE代理严重错误:", error);
    
    // 返回错误SSE流
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          error: 'SSE proxy failed',
          details: String(error),
          timestamp: new Date().toISOString()
        });
        
        controller.enqueue(`event: error\n`);
        controller.enqueue(`data: ${errorData}\n\n`);
        controller.close();
      }
    });
    
    return new Response(errorStream, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  }
}
