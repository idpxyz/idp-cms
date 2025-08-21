export interface FeedItem {
  id: string;
  title: string;
  body?: string;
  channel: string;
  publish_time?: string;
  tenant_id: string;
  site: string;
}

export interface FeedResponse {
  items: FeedItem[];
  next_cursor?: string;
  algo?: string;
}

export interface FeedParams {
  site?: string;
  size?: number;
  cursor?: string;
  channel?: string;
}
