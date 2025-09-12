from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.models import Comment
import requests
import json
from celery import shared_task
import re

class SpamDetector:
    """垃圾评论检测器"""
    
    def __init__(self):
        self.spam_patterns = [
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',  # URLs
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Email addresses
            r'(buy|sell|discount|price|\$)\s*\d+',  # Commercial content
            r'(viagra|cialis|pharmacy|drugs|casino|lottery|poker|bet)',  # Spam keywords
        ]
        
    def calculate_spam_score(self, comment_text: str, author_name: str, ip_address: str) -> float:
        """
        计算垃圾评论得分
        返回0-1之间的分数，分数越高越可能是垃圾评论
        """
        score = 0.0
        
        # 1. 检查内容长度
        if len(comment_text) < 5:
            score += 0.3
            
        # 2. 检查垃圾关键词
        text_to_check = f"{comment_text.lower()} {author_name.lower()}"
        for pattern in self.spam_patterns:
            if re.search(pattern, text_to_check):
                score += 0.4
                
        # 3. 检查重复字符
        if any(char * 3 in comment_text for char in set(comment_text)):
            score += 0.2
            
        # 4. 检查大写字母比例
        if sum(1 for c in comment_text if c.isupper()) / len(comment_text) > 0.5:
            score += 0.2
            
        # 确保得分不超过1
        return min(score, 1.0)

@shared_task
def process_new_comment(comment_id: int):
    """异步处理新评论"""
    try:
        comment = Comment.objects.get(id=comment_id)
        
        # 1. 计算垃圾评论得分
        detector = SpamDetector()
        spam_score = detector.calculate_spam_score(
            comment.content,
            comment.author_name,
            comment.ip_address or ''
        )
        comment.spam_score = spam_score
        
        # 2. 根据得分自动处理
        if spam_score > 0.8:
            comment.mark_as_spam()
        elif spam_score < 0.3 and not settings.COMMENT_MODERATION_REQUIRED:
            comment.approve()
        # 其他情况保持pending状态等待人工审核
        
        comment.save()
        
    except Comment.DoesNotExist:
        pass  # 评论可能已被删除
    except Exception as e:
        print(f"处理评论时出错: {e}")

class Command(BaseCommand):
    help = '处理待审核的评论'
    
    def handle(self, *args, **options):
        # 处理所有待审核的评论
        pending_comments = Comment.objects.filter(status='pending')
        
        for comment in pending_comments:
            process_new_comment.delay(comment.id)
            
        self.stdout.write(
            self.style.SUCCESS(f'成功处理 {pending_comments.count()} 条待审核评论')
        )
