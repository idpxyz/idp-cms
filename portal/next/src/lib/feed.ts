import { FeedResponse } from '@/types/feed';

export async function fetchFeed(nextCursor?: string, sortBy?: string): Promise<FeedResponse> {
  // Use relative URL - this will go through our Next.js API route proxy
  // which forwards the request to the Django backend
  const url = new URL("/api/feed", window.location.origin);
  url.searchParams.set("site", "localhost");
  url.searchParams.set("size", "20");
  if (nextCursor) url.searchParams.set("cursor", nextCursor);
  if (sortBy) url.searchParams.set("sort", sortBy);
  
  const res = await fetch(url.toString(), { 
    cache: "no-store", 
    headers: {"X-AB-Session": "demo-session"} 
  });
  
  if (!res.ok) throw new Error("feed fetch failed");
  return res.json() as Promise<FeedResponse>;
}
