export interface FeedItem {
  id: string;
  article_id: string;
  title: string;
  body?: string;
  author?: string;
  channel: string;
  topic?: string;
  tags?: string;
  publish_time?: string;
  site: string;
  tenant?: string;
  region?: string;
  lang?: string;
  has_video?: boolean;
  score?: number;
  final_score?: number;
  quality_score?: number;
  ctr_1h?: number;
  ctr_24h?: number;
  pop_1h?: number;
  pop_24h?: number;
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
