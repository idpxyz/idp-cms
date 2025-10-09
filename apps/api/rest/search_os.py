from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.api.rest.utils import validate_site_parameter
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name  # 🎯 使用简化索引


@api_view(["GET"])
def search_os(request):
    """
    OpenSearch 驱动的站内搜索
    支持参数：site, q, channel, categories, since, order(rel|time|hot), page, size
    """
    try:
        # 1) 站点
        site = validate_site_parameter(request)
        if not site:
            return Response({"error": "Invalid or missing site parameter"}, status=status.HTTP_400_BAD_REQUEST)

        # 2) 参数
        q = request.query_params.get("q", "").strip()
        channel = request.query_params.get("channel")
        categories_param = request.query_params.get("categories")
        since = request.query_params.get("since")  # e.g. 24h, 7d
        order = (request.query_params.get("order") or "rel").lower()
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(int(request.query_params.get("size", 20)), 100)
        start_from = (page - 1) * size

        # 3) 构建查询
        must = []
        filters = []

        # 关键词查询（多层次精确度策略 + 三级查询自适应）
        if q:
            # 估算查询词数（中文字符数）
            query_length = len(q.replace(" ", "").replace(",", "").replace("，", "").replace("、", ""))
            
            # 三级查询策略：
            # - 超短查询 (1-2字符): 严格 AND 匹配
            # - 中等查询 (3-6字符): 混合策略（短语优先 + OR兜底）
            # - 长查询 (>6字符): 宽松 OR 匹配
            is_very_short = query_length <= 2
            is_medium = 3 <= query_length <= 6
            is_long = query_length > 6
            
            if is_long:
                # 长查询：使用 OR 匹配 + 多层次加分，确保高召回率
                must.append({
                    "bool": {
                        "should": [
                            # 策略1：标题字段匹配（任意词匹配即可）
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^8", "seo_title^6"],
                                    "type": "best_fields",
                                    "operator": "or",     # OR 匹配，任意词出现即可
                                    "boost": 2.0
                                }
                            },
                            # 策略2：摘要字段匹配
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["summary^3", "excerpt^3", "search_description^2"],
                                    "type": "best_fields",
                                    "operator": "or",
                                    "boost": 1.5
                                }
                            },
                            # 策略3：正文字段匹配
                            {
                                "match": {
                                    "body": {
                                        "query": q,
                                        "operator": "or",
                                        "boost": 1.0
                                    }
                                }
                            },
                            # 加分项1：近似短语匹配（大间隔）
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^6", "summary^3", "excerpt^3"],
                                    "type": "phrase",
                                    "slop": 15,           # 非常宽松的间隔
                                    "boost": 3.0          # 有短语匹配大幅加分
                                }
                            },
                            # 加分项2：精确短语匹配
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^5", "seo_title^3", "summary", "excerpt"],
                                    "type": "phrase",
                                    "boost": 5.0          # 完全匹配给最高加分
                                }
                            }
                        ],
                        "minimum_should_match": 1  # 至少一个策略匹配
                    }
                })
            elif is_medium:
                # 中等查询 (3-6字符，如"军事动态"、"区块链")：短语优先 + 多数词匹配兜底
                must.append({
                    "bool": {
                        "should": [
                            # 策略1：精确短语匹配（最高权重）
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^10", "seo_title^8", "summary^5", "excerpt^5"],
                                    "type": "phrase",
                                    "boost": 4.0          # 完全匹配最高分
                                }
                            },
                            # 策略2：近似短语匹配（允许少量间隔）
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^8", "seo_title^6", "summary^4", "excerpt^4", "body^2"],
                                    "type": "phrase",
                                    "slop": 5,            # 允许5个词间隔
                                    "boost": 2.5
                                }
                            },
                            # 策略3：多数词匹配（至少75%的词）- 避免单字误匹配
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^6", "seo_title^4", "summary^2", "excerpt^2"],
                                    "type": "best_fields",
                                    "minimum_should_match": "75%",  # 至少75%的词匹配
                                    "boost": 1.8
                                }
                            },
                            # 策略4：部分词匹配（至少50%） - 更宽松的兜底
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^4", "summary", "excerpt", "body^0.5"],
                                    "type": "best_fields",
                                    "minimum_should_match": "50%",  # 至少50%的词匹配
                                    "boost": 1.0
                                }
                            }
                        ],
                        "minimum_should_match": 1
                    }
                })
            else:
                # 超短查询 (1-2字符，如"AI"、"5G")：严格匹配
                must.append({
                    "bool": {
                        "should": [
                            # 精确短语匹配
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^10", "seo_title^8", "summary^5", "excerpt^5"],
                                    "type": "phrase",
                                    "boost": 3.0
                                }
                            },
                            # AND 全匹配（严格）
                            {
                                "multi_match": {
                                    "query": q,
                                    "fields": ["title^8", "seo_title^6", "summary^3", "excerpt^3", "body^0.5"],
                                    "type": "best_fields",
                                    "operator": "and",
                                    "boost": 2.0
                                }
                            }
                        ],
                        "minimum_should_match": 1
                    }
                })

        # 频道过滤
        if channel:
            filters.append({"term": {"primary_channel_slug.keyword": channel}})

        # 分类过滤
        if categories_param:
            cats = [c.strip() for c in categories_param.split(',') if c.strip()]
            if cats:
                filters.append({"terms": {"categories": cats}})

        # 时间过滤
        if since:
            import datetime
            from django.utils import timezone
            now = timezone.now()
            gte = None
            try:
                # 确保 since 是字符串
                since_str = str(since) if since else ""
                if since_str.endswith('h'):
                    hours = int(since_str[:-1])
                    gte = now - datetime.timedelta(hours=hours)
                elif since_str.endswith('d'):
                    days = int(since_str[:-1])
                    gte = now - datetime.timedelta(days=days)
                elif since_str:
                    # ISO8601
                    gte = datetime.datetime.fromisoformat(since_str.replace('Z', '+00:00'))
            except Exception:
                gte = None
            if gte:
                filters.append({
                    "range": {"first_published_at": {"gte": gte.isoformat()}}
                })

        # 构建基础查询
        base_query = {"bool": {}}
        if must:
            base_query["bool"]["must"] = must
        else:
            base_query["bool"]["must"] = [{"match_all": {}}]
        if filters:
            base_query["bool"]["filter"] = filters

        # 根据排序类型构建最终查询和排序
        if order in ("time", "-first_published_at"):
            # 按时间排序：不使用 function_score
            final_query = base_query
            sort = [{"first_published_at": {"order": "desc"}}, {"article_id": {"order": "desc"}}]
        elif order in ("hot", "-pop_24h"):
            # 按热度排序：不使用 function_score
            final_query = base_query
            sort = [{"pop_24h": {"order": "desc"}}, {"first_published_at": {"order": "desc"}}]
        else:
            # 相关度排序：使用 function_score 混合评分（相关性 + 时效性 + 热度）
            final_query = {
                "function_score": {
                    "query": base_query,
                    "functions": [
                        {
                            # 时间衰减函数（高斯衰减）
                            # 新闻网站特性：时效性占40%权重
                            "gauss": {
                                "first_published_at": {
                                    "scale": "7d",      # 7天后衰减到50%
                                    "offset": "1d",     # 1天内不衰减
                                    "decay": 0.5        # 衰减率
                                }
                            },
                            "weight": 2.0  # 时效性权重（相对于相关性）
                        },
                        {
                            # 热度加成（24小时点击量）
                            # 热门新闻应该排名更靠前
                            "field_value_factor": {
                                "field": "pop_24h",
                                "factor": 0.001,      # 缩放因子
                                "modifier": "log1p",  # log(1 + value) 避免极端值
                                "missing": 0          # 缺失值处理
                            },
                            "weight": 1.0  # 热度权重
                        }
                    ],
                    "score_mode": "sum",      # 多个函数的分数相加
                    "boost_mode": "sum"       # 与查询分数相加
                }
            }
            sort = [{"_score": {"order": "desc"}}, {"first_published_at": {"order": "desc"}}]

        body = {
            "query": final_query,
            "sort": sort,
            "from": start_from,
            "size": size,
            "track_total_hits": True,
            # OpenSearch 原生高亮（支持中文分词高亮）
            "highlight": {
                "fields": {
                    "title": {
                        "pre_tags": ["<mark class='search-highlight'>"],
                        "post_tags": ["</mark>"],
                        "number_of_fragments": 0  # 返回整个标题（不截断）
                    },
                    "summary": {
                        "fragment_size": 150,      # 每个片段150字符
                        "number_of_fragments": 2,  # 最多返回2个片段
                        "pre_tags": ["<mark class='search-highlight'>"],
                        "post_tags": ["</mark>"]
                    },
                    "body": {
                        "fragment_size": 200,      # 正文片段200字符
                        "number_of_fragments": 3,  # 最多返回3个片段
                        "pre_tags": ["<mark class='search-highlight'>"],
                        "post_tags": ["</mark>"]
                    }
                },
                "require_field_match": False  # 允许跨字段高亮
            }
        }

        # 4) 执行查询
        client = get_client()
        index = get_index_name(site.hostname)  # 🎯 使用简化索引
        res = client.search(index=index, body=body)

        hits = res.get("hits", {})
        total = hits.get("total", {}).get("value", 0)
        items = []
        for h in hits.get("hits", []):
            s = h.get("_source", {})
            highlight = h.get("highlight", {})
            
            # 使用高亮结果（如果有），否则使用原始内容
            highlighted_title = highlight.get("title", [s.get("title")])[0] if highlight.get("title") else s.get("title")
            highlighted_summary = highlight.get("summary", [s.get("summary") or ""])
            highlighted_body = highlight.get("body", [])
            
            items.append({
                "id": s.get("article_id") or h.get("_id"),
                "title": s.get("title"),  # 原始标题
                "slug": s.get("slug"),
                "excerpt": s.get("summary") or "",  # 原始摘要
                "cover": None,
                "publish_at": s.get("first_published_at") or s.get("publish_time"),
                "channel": {"slug": s.get("primary_channel_slug") or s.get("channel"), "name": s.get("primary_channel_slug")},
                "region": s.get("region"),
                "is_featured": False,
                "_score": h.get("_score", 0),  # OpenSearch 的相关性分数
                # OpenSearch 原生高亮结果
                "highlight": {
                    "title": highlighted_title,
                    "summary": highlighted_summary,  # 数组，可能有多个片段
                    "body": highlighted_body  # 数组，可能有多个片段
                }
            })

        response_data = {
            "items": items,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "has_next": (page * size) < total,
                "has_prev": page > 1,
            },
            "meta": {"site": site.hostname if site else None},
        }

        return Response(response_data)

    except Exception as e:
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


