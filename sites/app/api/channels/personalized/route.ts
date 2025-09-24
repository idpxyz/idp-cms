/**
 * 个性化频道API代理
 * 将请求转发到Django后端的个性化频道接口
 */

import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export async function GET(request: NextRequest) {
  try {
    // 构建后端API URL
    const backendUrl = endpoints.getCmsEndpoint('/api/channels/personalized/');
    
    // 转发请求头（包含用户标识信息）
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 转发重要的用户标识头
    const userHeaders = [
      'x-device-id', 
      'x-session-id', 
      'x-user-id',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip'
    ];
    
    userHeaders.forEach(headerName => {
      const value = request.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });
    
    console.log('🎯 Fetching personalized channels from:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store' // 个性化内容不缓存
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Personalized channels fetched:', {
      strategy: data.strategy,
      confidence: data.confidence,
      channelCount: data.channels?.length || 0
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error fetching personalized channels:', error);
    
    // 降级策略：尝试直接获取静态频道列表
    try {
      // 使用站点信息从请求中获取，避免硬编码
      const url = new URL(request.url);
      const site = url.searchParams.get('site') || 'aivoya.com';
      // 使用相对路径调用内部API
      const staticResponse = await fetch(`/api/channels/?site=${site}`, {
        next: { revalidate: 300 }
      });
      
      if (staticResponse.ok) {
        const staticData = await staticResponse.json();
        const fallbackChannels = staticData.results?.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          weight: 0.05, // 均等权重
          reason: "降级策略"
        })) || [];
        
        console.log(`🔄 Using static channels as fallback: ${fallbackChannels.length} channels`);
        
        return NextResponse.json({
          channels: fallbackChannels,
          strategy: "fallback",
          confidence: 0.0,
          interests: {},
          debug: {
            total_channels: fallbackChannels.length,
            personalized_count: fallbackChannels.length,
            strategy_details: { type: "fallback", reason: "API调用失败，使用静态频道" }
          }
        });
      }
    } catch (staticError) {
      console.error('❌ Failed to fetch static channels for fallback:', staticError);
    }
    
    // 最终降级：返回空列表但保持结构一致
    return NextResponse.json({
      channels: [],
      strategy: "error",
      confidence: 0.0,
      interests: {},
      error: "无法获取频道列表",
      debug: {
        total_channels: 0,
        personalized_count: 0,
        strategy_details: { type: "error", reason: "所有降级策略都失败" }
      }
    });
  }
}
