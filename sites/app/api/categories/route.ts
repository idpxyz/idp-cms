/**
 * Categories API 代理路由
 * 为前端提供分类数据，避免CORS问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { endpoints } from '@/lib/config/endpoints';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    
    // 构建后端API URL
    const backendUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/categories/'),
      Object.fromEntries(searchParams.entries())
    );

    // 代理请求到后端
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      console.warn('Categories proxy: backend non-OK', response.status);
      return NextResponse.json({ count: 0, results: [] }, { status: 200 });
    }

    // 先获取响应文本，然后解析JSON
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Categories proxy: JSON parse failed');
      return NextResponse.json({ count: 0, results: [] }, { status: 200 });
    }
    
    // 返回数据
    return NextResponse.json(data);

  } catch (error) {
    console.error('Categories API proxy error:', error);
    return NextResponse.json(
      { count: 0, results: [] },
      { status: 200 }
    );
  }
}
