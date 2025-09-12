import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // 轻量级前端逻辑使用Edge
export const revalidate = 3600 // 1小时缓存

// 布局配置（纯前端，无后端依赖）
const LAYOUT_CONFIGS = {
  'layout-portal-classic': {
    name: 'Portal Classic',
    description: '经典门户布局',
    regions: ['header', 'main', 'footer'],
    responsive: true,
    supports: ['portal']
  },
  'layout-localsite-grid': {
    name: 'Local Site Grid',
    description: '地方站点网格布局',
    regions: ['header', 'sidebar', 'main', 'footer'],
    responsive: true,
    supports: ['localsite']
  },
  'layout-localsite-magazine': {
    name: 'Local Site Magazine',
    description: '地方站点杂志布局',
    regions: ['header', 'hero', 'main', 'sidebar', 'footer'],
    responsive: true,
    supports: ['localsite']
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const layoutKey = url.searchParams.get('layout')
  const siteType = url.searchParams.get('type') // portal 或 localsite
  
  if (layoutKey) {
    const config = LAYOUT_CONFIGS[layoutKey as keyof typeof LAYOUT_CONFIGS]
    if (!config) {
      return NextResponse.json({ error: 'layout not found' }, { status: 404 })
    }
    
    // 检查站点类型兼容性
    if (siteType && !config.supports.includes(siteType)) {
      return NextResponse.json({ 
        error: 'layout not compatible with site type',
        layout: layoutKey,
        siteType,
        supported: config.supports
      }, { status: 400 })
    }
    
    return NextResponse.json({
      layout: layoutKey,
      config,
      timestamp: new Date().toISOString()
    })
  }
  
  // 返回所有布局配置
  const availableLayouts = Object.entries(LAYOUT_CONFIGS).map(([key, config]) => ({
    key,
    ...config
  }))
  
  return NextResponse.json({
    layouts: availableLayouts,
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  // 用于动态布局配置更新（仅开发环境）
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not allowed in production' }, { status: 403 })
  }
  
  try {
    const { layoutKey, config } = await req.json()
    
    if (!layoutKey || !config) {
      return NextResponse.json({ error: 'missing layoutKey or config' }, { status: 400 })
    }
    
    // 这里可以添加布局配置验证逻辑
    // 实际项目中可能需要持久化存储
    
    return NextResponse.json({
      success: true,
      layout: layoutKey,
      message: 'Layout configuration updated',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Layout config error:', error)
    return NextResponse.json(
      { error: 'invalid request' }, 
      { status: 400 }
    )
  }
}
