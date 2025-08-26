import { FeedResponse } from '@/types/feed';
import { getCurrentSite } from './siteDetection';

export async function fetchFeed(nextCursor?: string, sortBy?: string, site?: string): Promise<FeedResponse> {
  try {
    // Use relative URL - this will go through our Next.js API route proxy
    // which forwards the request to the Django backend
    const url = new URL("/api/feed", window.location.origin);
    
    // 智能站点识别：优先使用参数，否则自动检测当前站点
    const targetSite = site || getCurrentSite();
    console.log(`[Feed API] Using site: ${targetSite} (provided: ${site || 'auto-detected'})`);
    url.searchParams.set("site", targetSite);
    
    url.searchParams.set("size", "20");
    if (nextCursor) url.searchParams.set("cursor", nextCursor);
    if (sortBy) url.searchParams.set("sort", sortBy);
    
    console.log('[Feed API] Fetching from URL:', url.toString());
    
    const res = await fetch(url.toString(), { 
      cache: "no-store", 
      headers: {
        "X-AB-Session": "demo-session",
        // 确保Host header正确传递（对于代理很重要）
        "X-Forwarded-Host": window.location.hostname
      } 
    });
    
    console.log('[Feed API] Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Feed API] Response not ok:', res.status, errorText);
      throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('[Feed API] Successfully fetched feed:', data.items?.length || 0, 'items');
    return data as FeedResponse;
  } catch (error) {
    console.error('[Feed API] Error in fetchFeed:', error);
    throw error;
  }
}
