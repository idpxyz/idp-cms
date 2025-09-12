import { NextRequest } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    console.log("🔗 模拟分析事件流代理连接");
    
    const djangoUrl = endpoints.getCmsEndpoint('/api/mock/analytics/stream/');
    console.log(`📡 代理到Django模拟分析事件流: ${djangoUrl}`);
    
    const response = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'User-Agent': 'IDP-CMS-Portal-Mock-Analytics-SSE/1.0',
      },
    });

    if (!response.ok) {
      console.error(`❌ Django模拟分析事件流错误: ${response.status}`);
      
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = JSON.stringify({
            error: `模拟分析事件流上游错误: ${response.status}`,
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
        }
      });
    }

    console.log(`✅ Django模拟分析事件流连接成功`);

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
        'X-Accel-Buffering': 'no',
      }
    });
    
  } catch (error) {
    console.error("🚨 模拟分析事件流代理错误:", error);
    
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          error: '模拟分析事件流代理失败',
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
      }
    });
  }
}
