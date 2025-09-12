import { NextRequest } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    console.log("🔗 基础SSE代理连接");
    
    const djangoUrl = endpoints.getCmsEndpoint('/api/basic/sse/');
    console.log(`📡 代理到Django基础SSE: ${djangoUrl}`);
    
    const response = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'User-Agent': 'IDP-CMS-Portal-Basic-SSE/1.0',
      },
    });

    if (!response.ok) {
      console.error(`❌ Django基础SSE错误: ${response.status}`);
      
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = JSON.stringify({
            error: `基础SSE上游错误: ${response.status}`,
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

    console.log(`✅ Django基础SSE连接成功`);

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
        'X-Accel-Buffering': 'no',
      }
    });
    
  } catch (error) {
    console.error("🚨 基础SSE代理错误:", error);
    
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          error: '基础SSE代理失败',
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
