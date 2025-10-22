/**
 * 个性化频道API代理
 * 将请求转发到Django后端的个性化频道接口
 */

import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export async function GET(request: NextRequest) {
  try {
    // 使用统一的 getMainSite() 获取主站点（会根据环境变量动态返回）
    const siteHostname = getMainSite().hostname;
    
    // 构建后端API URL，包含 site 参数
    const backendUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels/personalized/'),
      { site: siteHostname }
    );
    
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
      // 使用统一的 getMainSite() 获取主站点
      const siteHostname = getMainSite().hostname;
      
      // 构建完整的后端API URL
      const staticUrl = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/channels/'),
        { site: siteHostname }
      );
      
      console.log('🔄 Trying fallback to static channels:', staticUrl);
      
      const staticResponse = await fetch(staticUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (staticResponse.ok) {
        const staticData = await staticResponse.json();
        // 注意：API 返回的是 channels 而不是 results
        const fallbackChannels = (staticData.channels || []).map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          weight: 0.05, // 均等权重
          reason: "降级策略"
        }));
        
        console.log(`✅ Using static channels as fallback: ${fallbackChannels.length} channels`);
        
        return NextResponse.json({
          channels: fallbackChannels,
          strategy: "fallback",
          confidence: 0.0,
          interests: {},
          debug: {
            total_channels: fallbackChannels.length,
            personalized_count: fallbackChannels.length,
            strategy_details: { type: "fallback", reason: "个性化API失败，使用静态频道列表" }
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
