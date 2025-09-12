import { NextRequest, NextResponse } from 'next/server'
import { endpoints } from "@/lib/config/endpoints";

export const runtime = 'nodejs'      // 避免 edge 限制
export const revalidate = 120

const CMS = endpoints.getCmsEndpoint()

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const site = url.searchParams.get('site') || ''
  
  if (!isAllowedSite(site)) {
    return NextResponse.json({ error: 'invalid site' }, { status: 400 })
  }

  const upstream = new URL('/api/v1/articles', CMS)
  url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v))

  try {
    const upstreamRes = await fetch(upstream.toString(), {
      // 2~5s 可调；失败可做至多2次轻重试
      // @ts-ignore
      signal: AbortSignal.timeout(4000),
      headers: { 
        'x-request-id': req.headers.get('x-request-id') || crypto.randomUUID() 
      },
      // 让 Next/边缘参与缓存
      next: { revalidate: 120, tags: [`site:${site}`] }
    })

    // 透传状态码与关键响应头（命中 CDN/ISR）
    const body = await upstreamRes.text()
    const response = new (NextResponse as any)(body, { 
      status: upstreamRes.status
    })
    
    // 复制关键响应头
    (['cache-control','etag','surrogate-key','content-type'] as const).forEach((h: string) => {
      const v = upstreamRes.headers.get(h); 
      if (v) response.headers.set(h, v)
    })
    
    return response
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'upstream error', upstream: 'timeout' }, 
      { status: 502 }
    )
  }
}

function isAllowedSite(host: string) {
  return !!host && /^[a-z0-9.-]+$/.test(host) && !host.includes('..')
}
