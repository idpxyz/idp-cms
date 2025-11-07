# 重建索引
ssh root@8.133.22.7 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring python manage.py reindex_all_articles --site localhost --clear"

# 清理无效图片
ssh root@8.133.22.7 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring python manage.py cleanup_invalid_images --confirm"