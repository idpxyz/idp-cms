import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const revalidate = 0 // 禁用缓存，总是执行

export async function POST(req: NextRequest) {
  try {
    const { tag, path, secret } = await req.json()
    
    // 验证密钥（生产环境应使用环境变量）
    if (secret !== process.env.CACHE_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    let revalidated = false
    
    if (tag) {
      revalidateTag(tag)
      revalidated = true
      console.log(`Revalidated tag: ${tag}`)
    }
    
    if (path) {
      revalidatePath(path)
      revalidated = true
      console.log(`Revalidated path: ${path}`)
    }
    
    if (!revalidated) {
      return NextResponse.json({ error: 'missing tag or path' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      revalidated: { tag, path },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Cache revalidation error:', error)
    return NextResponse.json(
      { error: 'internal error' }, 
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tag = url.searchParams.get('tag')
  const path = url.searchParams.get('path')
  
  if (!tag && !path) {
    return NextResponse.json({ error: 'missing tag or path' }, { status: 400 })
  }
  
  try {
    let revalidated = false
    
    if (tag) {
      revalidateTag(tag)
      revalidated = true
    }
    
    if (path) {
      revalidatePath(path)
      revalidated = true
    }
    
    return NextResponse.json({ 
      success: true, 
      revalidated: { tag, path },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Cache revalidation error:', error)
    return NextResponse.json(
      { error: 'internal error' }, 
      { status: 500 }
    )
  }
}
