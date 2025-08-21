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
  dwell_ms UInt32 DEFAULT 0
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
  dwell_ms_sum UInt64
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
  sumIf(dwell_ms, event='dwell') AS dwell_ms_sum
FROM events
GROUP BY window_start, site, channel, article_id;
