#!/usr/bin/env python
"""
数据迁移验证脚本

使用方法:
    python manage.py shell < scripts/verify_migration.py
    
    或
    
    python scripts/verify_migration.py  # 如果配置了Django环境
"""

import os
import sys
import django

# 配置Django环境（如果直接运行）
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from apps.news.models import ArticlePage
from apps.media.models import CustomImage
from apps.core.models import Channel, Category
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta


def print_section(title):
    """打印章节标题"""
    print('\n' + '=' * 60)
    print(f'  {title}')
    print('=' * 60)


def print_stat(label, value, unit='', status=''):
    """打印统计信息"""
    status_icon = {
        'ok': '✓',
        'warning': '⚠',
        'error': '✗',
        'info': 'ℹ',
    }.get(status, ' ')
    
    print(f'{status_icon} {label:.<40} {value:>10} {unit}')


def main():
    print_section('文章数据迁移验证报告')
    print(f'生成时间: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}')
    
    # 1. 基本统计
    print_section('1. 基本统计')
    
    total_articles = ArticlePage.objects.count()
    print_stat('文章总数', total_articles, '篇', 'info')
    
    published = ArticlePage.objects.live().count()
    print_stat('已发布', published, '篇', 'ok' if published > 0 else 'warning')
    
    drafts = ArticlePage.objects.filter(live=False).count()
    print_stat('草稿', drafts, '篇', 'info')
    
    # 2. 内容完整性
    print_section('2. 内容完整性')
    
    with_title = ArticlePage.objects.exclude(title='').count()
    print_stat('有标题', with_title, '篇', 'ok' if with_title == total_articles else 'error')
    
    with_body = ArticlePage.objects.exclude(body='').count()
    print_stat('有正文', with_body, '篇', 'ok' if with_body > 0 else 'warning')
    
    with_excerpt = ArticlePage.objects.exclude(excerpt='').count()
    print_stat('有摘要', with_excerpt, '篇', 'info')
    
    # 3. 图片统计
    print_section('3. 图片统计')
    
    with_cover = ArticlePage.objects.exclude(cover__isnull=True).count()
    without_cover = ArticlePage.objects.filter(cover__isnull=True).count()
    
    if total_articles > 0:
        cover_rate = (with_cover / total_articles) * 100
        status = 'ok' if cover_rate > 80 else 'warning' if cover_rate > 50 else 'error'
    else:
        cover_rate = 0
        status = 'info'
    
    print_stat('有封面图', with_cover, '篇', status)
    print_stat('无封面图', without_cover, '篇', 'info')
    print_stat('封面覆盖率', f'{cover_rate:.1f}', '%', 'info')
    
    # 4. 分类关联
    print_section('4. 分类关联')
    
    total_channels = Channel.objects.count()
    print_stat('频道总数', total_channels, '个', 'ok' if total_channels > 0 else 'warning')
    
    with_channel = ArticlePage.objects.exclude(channel__isnull=True).count()
    without_channel = ArticlePage.objects.filter(channel__isnull=True).count()
    
    print_stat('已关联频道', with_channel, '篇', 'ok' if with_channel > 0 else 'warning')
    print_stat('未关联频道', without_channel, '篇', 'warning' if without_channel > 0 else 'ok')
    
    # 频道分布
    if total_channels > 0:
        print('\n  频道分布:')
        for channel in Channel.objects.all()[:5]:
            count = ArticlePage.objects.filter(channel=channel).count()
            print(f'    • {channel.name:.<30} {count:>6} 篇')
    
    # 5. 标签统计
    print_section('5. 标签统计')
    
    with_tags = ArticlePage.objects.annotate(
        tag_count=Count('tags')
    ).filter(tag_count__gt=0).count()
    
    without_tags = total_articles - with_tags
    
    print_stat('有标签', with_tags, '篇', 'ok' if with_tags > 0 else 'warning')
    print_stat('无标签', without_tags, '篇', 'info')
    
    # 总标签数
    from taggit.models import Tag
    total_tags = Tag.objects.count()
    print_stat('标签总数', total_tags, '个', 'info')
    
    # 热门标签
    if total_tags > 0:
        print('\n  热门标签 (前10):')
        from django.db.models import Count
        hot_tags = Tag.objects.annotate(
            num_times=Count('taggit_taggeditem_items')
        ).order_by('-num_times')[:10]
        
        for tag in hot_tags:
            print(f'    • {tag.name:.<30} {tag.num_times:>6} 次')
    
    # 6. SEO字段
    print_section('6. SEO 字段')
    
    with_seo_title = ArticlePage.objects.exclude(seo_title='').count()
    print_stat('有SEO标题', with_seo_title, '篇', 'info')
    
    with_meta_desc = ArticlePage.objects.exclude(search_description='').count()
    print_stat('有SEO描述', with_meta_desc, '篇', 'info')
    
    with_meta_keywords = ArticlePage.objects.exclude(meta_keywords='').count()
    print_stat('有SEO关键词', with_meta_keywords, '篇', 'info')
    
    # 7. 时间统计
    print_section('7. 时间统计')
    
    if total_articles > 0:
        oldest = ArticlePage.objects.order_by('first_published_at').first()
        newest = ArticlePage.objects.order_by('-first_published_at').first()
        
        if oldest and oldest.first_published_at:
            print_stat('最早文章', oldest.first_published_at.strftime('%Y-%m-%d'), '', 'info')
        
        if newest and newest.first_published_at:
            print_stat('最新文章', newest.first_published_at.strftime('%Y-%m-%d'), '', 'info')
        
        # 最近30天
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent = ArticlePage.objects.filter(
            first_published_at__gte=thirty_days_ago
        ).count()
        print_stat('最近30天发布', recent, '篇', 'info')
    
    # 8. 作者统计
    print_section('8. 作者统计')
    
    with_author = ArticlePage.objects.exclude(author_name='').count()
    without_author = ArticlePage.objects.filter(author_name='').count()
    
    print_stat('有作者', with_author, '篇', 'info')
    print_stat('无作者', without_author, '篇', 'info')
    
    # 作者分布
    authors = ArticlePage.objects.exclude(author_name='').values('author_name').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    if authors:
        print('\n  作者排行 (前10):')
        for author in authors:
            print(f'    • {author["author_name"]:.<30} {author["count"]:>6} 篇')
    
    # 9. 来源信息
    print_section('9. 来源信息')
    
    with_external_url = ArticlePage.objects.exclude(external_url='').count()
    print_stat('有外部链接', with_external_url, '篇', 'info')
    
    has_video = ArticlePage.objects.filter(has_video=True).count()
    print_stat('包含视频', has_video, '篇', 'info')
    
    # 10. 数据质量评分
    print_section('10. 数据质量评分')
    
    if total_articles > 0:
        # 计算质量分数（满分100）
        quality_score = 0
        
        # 基础内容 (30分)
        quality_score += (with_title / total_articles) * 10  # 标题
        quality_score += (with_body / total_articles) * 10   # 正文
        quality_score += (with_excerpt / total_articles) * 10 # 摘要
        
        # 图片 (20分)
        quality_score += (with_cover / total_articles) * 20
        
        # 分类 (20分)
        quality_score += (with_channel / total_articles) * 20
        
        # SEO (15分)
        quality_score += (with_seo_title / total_articles) * 5
        quality_score += (with_meta_desc / total_articles) * 5
        quality_score += (with_meta_keywords / total_articles) * 5
        
        # 标签 (10分)
        quality_score += (with_tags / total_articles) * 10
        
        # 作者 (5分)
        quality_score += (with_author / total_articles) * 5
        
        # 评级
        if quality_score >= 90:
            grade = 'A (优秀)'
            status = 'ok'
        elif quality_score >= 80:
            grade = 'B (良好)'
            status = 'ok'
        elif quality_score >= 70:
            grade = 'C (合格)'
            status = 'warning'
        elif quality_score >= 60:
            grade = 'D (需改进)'
            status = 'warning'
        else:
            grade = 'F (较差)'
            status = 'error'
        
        print_stat('综合质量评分', f'{quality_score:.1f}', '分', status)
        print_stat('质量等级', grade, '', status)
    
    # 11. 潜在问题
    print_section('11. 潜在问题检查')
    
    issues = []
    
    # 检查空标题
    empty_title = ArticlePage.objects.filter(title='').count()
    if empty_title > 0:
        issues.append(f'有 {empty_title} 篇文章没有标题')
    
    # 检查空正文
    empty_body = ArticlePage.objects.filter(body='').count()
    if empty_body > 0:
        issues.append(f'有 {empty_body} 篇文章没有正文')
    
    # 检查未关联频道
    if without_channel > 0:
        issues.append(f'有 {without_channel} 篇文章未关联频道')
    
    # 检查重复slug
    from django.db.models import Count
    duplicate_slugs = ArticlePage.objects.values('slug').annotate(
        count=Count('id')
    ).filter(count__gt=1).count()
    
    if duplicate_slugs > 0:
        issues.append(f'发现 {duplicate_slugs} 个重复的slug')
    
    if issues:
        for issue in issues:
            print_stat(issue, '', '', 'warning')
    else:
        print_stat('未发现明显问题', '', '', 'ok')
    
    # 12. 建议
    print_section('12. 优化建议')
    
    suggestions = []
    
    if cover_rate < 80:
        suggestions.append('建议补充更多文章的封面图片')
    
    if without_channel > total_articles * 0.1:
        suggestions.append('建议为所有文章关联频道')
    
    if with_tags < total_articles * 0.5:
        suggestions.append('建议为更多文章添加标签')
    
    if with_excerpt < total_articles * 0.5:
        suggestions.append('建议为更多文章添加摘要')
    
    if with_meta_desc < total_articles * 0.7:
        suggestions.append('建议完善文章的SEO描述')
    
    if suggestions:
        for i, suggestion in enumerate(suggestions, 1):
            print(f'{i}. {suggestion}')
    else:
        print_stat('数据质量良好，暂无优化建议', '', '', 'ok')
    
    # 总结
    print_section('验证完成')
    
    if total_articles == 0:
        print('\n⚠ 警告: 没有找到任何文章数据！')
        print('  请检查导入过程是否成功。')
    elif total_articles < 1000:
        print(f'\nℹ 提示: 当前只有 {total_articles} 篇文章')
        print('  如果这是测试导入，可以继续正式导入全部数据。')
    else:
        print(f'\n✓ 成功导入 {total_articles} 篇文章！')
        print('  数据迁移基本完成，建议进行以下后续工作：')
        print('  1. 重建搜索索引: python manage.py update_index')
        print('  2. 更新页面树: python manage.py fixtree')
        print('  3. 生成缩略图: python manage.py wagtail_update_image_renditions')
        print('  4. 清理缓存: python manage.py clear_cache')
    
    print('\n' + '=' * 60 + '\n')


if __name__ == '__main__':
    main()

