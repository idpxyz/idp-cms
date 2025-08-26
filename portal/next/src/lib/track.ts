export function track(event:string, articleIds:string[], dwellMs?:number, metadata?:string){
  if (typeof navigator === "undefined") return;
  const url = process.env.NEXT_PUBLIC_TRACK_URL || "/api/track";
  const body = {
    ts: Date.now(),
    user_id: "demo-user",
    device_id: "demo-device",
    session_id: "demo-session",
    event, 
    article_ids: articleIds,
    channel: metadata || "recommend",  // 使用metadata作为channel或其他信息
    site: process.env.SITE_HOSTNAME || "localhost",
    dwell_ms: dwellMs || 0
  };
  
  // 使用 fetch 而不是 sendBeacon，确保更好的兼容性
  fetch(url, {
    method: "POST", 
    headers: {
      "Content-Type": "application/json",
      "X-Site-ID": process.env.SITE_HOSTNAME || "localhost"
    }, 
    body: JSON.stringify(body)
  }).catch(error => {
    console.warn('Track event failed:', error);
  });
}
