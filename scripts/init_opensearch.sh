#!/usr/bin/env bash
set -euo pipefail

OS_URL=${OPENSEARCH_URL:-https://192.168.8.195:9200}
OS_USER=${OPENSEARCH_USERNAME:-admin}
OS_PASS=${OPENSEARCH_PASSWORD:-OpenSearch2024!@#$%}
SITE=${SITE_HOSTNAME:-site-a.local}
INDEX="news_${SITE//./_}_articles"

echo "Creating index: $INDEX on $OS_URL ..."
curl -k -sS -u "$OS_USER:$OS_PASS" -H 'Content-Type: application/json' -X PUT \
  "$OS_URL/$INDEX" -d '{
    "settings": {"index": {"number_of_shards": 1, "number_of_replicas": 0}},
    "mappings": {
      "properties": {
        "article_id": {"type": "keyword"},
        "tenant": {"type": "keyword"},
        "site": {"type": "keyword"},
        "channel": {"type": "keyword"},
        "topic": {"type": "keyword"},
        "tags": {"type": "keyword"},
        "author": {"type": "keyword"},
        "title": {"type": "text"},
        "body": {"type": "text"},
        "has_video": {"type": "boolean"},
        "region": {"type": "keyword"},
        "publish_time": {"type": "date"},
        "pop_1h": {"type": "float"},
        "pop_24h": {"type": "float"},
        "ctr_1h": {"type": "float"},
        "ctr_24h": {"type": "float"},
        "quality_score": {"type": "float"},
        "lang": {"type": "keyword"}
      }
    }
  }'
echo
echo "Done."
