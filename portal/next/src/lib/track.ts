export function track(event:string, articleIds:string[], dwellMs?:number){
  if (typeof navigator === "undefined") return;
  const url = process.env.NEXT_PUBLIC_TRACK_URL || "http://localhost:8000/api/track";
  const body = {
    ts: Date.now(),
    user_id: "demo-user",
    device_id: "demo-device",
    session_id: "demo-session",
    event, article_ids: articleIds,
    channel: "recommend",
    site: process.env.SITE_HOSTNAME || "site-a.local",
    dwell_ms: dwellMs || 0
  };
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([JSON.stringify(body)], {type:"application/json"}));
  } else {
    fetch(url, {method:"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)});
  }
}
