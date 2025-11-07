"""
标签建议API接口

提供文章标签自动建议功能
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from apps.news.services.tag_suggestion import tag_suggestion_api
import json
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@csrf_exempt
def suggest_tags(request):
    """
    为文章内容建议标签
    
    POST /api/suggest-tags/
    {
        "title": "文章标题",
        "content": "文章内容",
        "site_id": 1  // 可选
    }
    """
    try:
        # 统一使用 DRF 的 request.data，避免重复读取请求体导致异常
        data = request.data
        
        title = data.get('title', '').strip()
        # 接受 content 或 body，统一为 content 变量
        content = (data.get('content') or data.get('body') or '').strip()
        site_id = data.get('site_id')
        
        # 基本验证
        if not title and not content:
            return Response({
                'success': False,
                'error': '标题和内容不能都为空'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取标签建议
        result = tag_suggestion_api.get_suggestions_for_article({
            'title': title,
            'body': content,  # 服务层优先读取 body
            'site_id': site_id
        })
        
        return Response(result)
        
    except json.JSONDecodeError:
        return Response({
            'success': False,
            'error': '无效的JSON格式'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"标签建议API错误: {str(e)}")
        return Response({
            'success': False,
            'error': '服务器内部错误'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@csrf_exempt
def batch_suggest_tags(request):
    """
    批量建议标签（用于文章批量处理）
    
    POST /api/batch-suggest-tags/
    {
        "articles": [
            {"id": 1, "title": "标题1", "content": "内容1"},
            {"id": 2, "title": "标题2", "content": "内容2"}
        ]
    }
    """
    try:
        # 统一使用 DRF 的 request.data
        data = request.data
        articles = data.get('articles', [])
        
        if not articles:
            return Response({
                'success': False,
                'error': '文章列表不能为空'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        
        for article in articles:
            try:
                article_id = article.get('id')
                # 兼容 content/body 两种键名
                if 'body' not in article and 'content' in article:
                    article = {**article, 'body': article.get('content')}
                result = tag_suggestion_api.get_suggestions_for_article(article)
                result['article_id'] = article_id
                results.append(result)
            except Exception as e:
                logger.error(f"文章 {article.get('id')} 标签建议失败: {str(e)}")
                results.append({
                    'article_id': article.get('id'),
                    'success': False,
                    'error': str(e)
                })
        
        return Response({
            'success': True,
            'results': results,
            'total_processed': len(results)
        })
        
    except Exception as e:
        logger.error(f"批量标签建议API错误: {str(e)}")
        return Response({
            'success': False,
            'error': '服务器内部错误'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def tag_suggestion_status(request):
    """
    获取标签建议服务状态
    
    GET /api/tag-suggestion-status/
    """
    try:
        from taggit.models import Tag
        
        total_tags = Tag.objects.count()
        
        # 简单的健康检查
        test_result = tag_suggestion_api.get_suggestions_for_article({
            'title': '测试标题',
            'body': '这是一个测试内容，用于检查标签建议服务是否正常工作。'
        })
        
        return Response({
            'success': True,
            'service_status': 'healthy',
            'total_existing_tags': total_tags,
            'test_suggestions_count': test_result.get('total_count', 0),
            'message': '标签建议服务运行正常'
        })
        
    except Exception as e:
        logger.error(f"标签建议状态检查失败: {str(e)}")
        return Response({
            'success': False,
            'service_status': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
