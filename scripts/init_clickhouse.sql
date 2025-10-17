CREATE TABLE IF NOT EXISTS events
(
  ts DateTime64(3, 'UTC'),
  user_id String,
  device_id String,
  session_id String,
  event String,
  article_id String,
  channel String,
  site String,
  dwell_ms UInt32 DEFAULT 0,
  search_query String DEFAULT '',
  event_value Float64 DEFAULT 0.0,
  reading_progress Float64 DEFAULT 0.0,
  social_action String DEFAULT ''
)
ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY (site, channel, article_id, ts);

CREATE TABLE IF NOT EXISTS article_metrics_agg
(
  window_start DateTime,
  site String,
  channel String,
  article_id String,
  impressions UInt64,
  clicks UInt64,
  dwell_ms_sum UInt64,
  shares UInt64 DEFAULT 0,
  comments UInt64 DEFAULT 0,
  likes UInt64 DEFAULT 0,
  favorites UInt64 DEFAULT 0,
  reading_completion_rate Float64 DEFAULT 0.0,
  bounce_rate Float64 DEFAULT 0.0,
  social_score Float64 DEFAULT 0.0
)
ENGINE = SummingMergeTree
PARTITION BY toDate(window_start)
ORDER BY (site, channel, article_id, window_start);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_events_agg TO article_metrics_agg AS
SELECT
  toStartOfInterval(ts, INTERVAL 1 MINUTE) AS window_start,
  site, channel, article_id,
  countIf(event='impression') AS impressions,
  countIf(event='click') AS clicks,
  sumIf(dwell_ms, event='dwell') AS dwell_ms_sum,
  countIf(social_action='share') AS shares,
  countIf(social_action='comment') AS comments,
  countIf(social_action='like') AS likes,
  countIf(social_action='favorite') AS favorites,
  avgIf(reading_progress, event='dwell' AND reading_progress > 0) AS reading_completion_rate,
  0.0 AS bounce_rate,
  toFloat64(countIf(social_action='like') + countIf(social_action='share') * 2 + countIf(social_action='comment') * 1.5) AS social_score
FROM events
GROUP BY window_start, site, channel, article_id;
