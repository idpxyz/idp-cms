#!/usr/bin/env python3
"""
从文章正文中提取封面图片
用于修复那些正文中有图片但缺少封面图的文章
"""

import os
import sys
import re
import requests
import django
from pathlib import Path

# 设置 Django 环境
sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from apps.portal.models import Article


def extract_first_image_from_html(html_content):
    """
    从 HTML 内容中提取第一张图片的 URL
    """
    if not html_content:
        return None
    
    # 匹配 img 标签中的 src 属性
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    matches = re.findall(img_pattern, html_content, re.IGNORECASE)
    
    if matches:
        # 返回第一张图片的 URL
        return matches[0]
    
    return None


def update_articles_with_missing_covers(dry_run=True, limit=None):
    """
    更新缺少封面图但正文中有图片的文章
    
    Args:
        dry_run: 如果为 True，只显示将要更新的文章，不实际更新
        limit: 限制处理的文章数量，None 表示处理所有
    """
    # 查找 image_url 为空的文章
    articles = Article.objects.filter(
        image_url__isnull=True
    ).exclude(
        content__isnull=True
    ).exclude(
        content=''
    )
    
    if limit:
        articles = articles[:limit]
    
    total_count = articles.count()
    print(f"找到 {total_count} 篇缺少封面图的文章")
    print(f"模式: {'试运行（不会实际更新）' if dry_run else '实际更新'}")
    print("-" * 80)
    
    updated_count = 0
    no_image_count = 0
    
    for i, article in enumerate(articles, 1):
        # 从正文中提取第一张图片
        first_image_url = extract_first_image_from_html(article.content)
        
        if first_image_url:
            print(f"\n[{i}/{total_count}] 文章: {article.title[:50]}...")
            print(f"  ID: {article.id}")
            print(f"  Slug: {article.slug}")
            print(f"  提取到的图片: {first_image_url}")
            
            if not dry_run:
                # 实际更新
                article.image_url = first_image_url
                article.save(update_fields=['image_url'])
                print(f"  ✓ 已更新")
            else:
                print(f"  [试运行] 将会更新")
            
            updated_count += 1
        else:
            no_image_count += 1
            if i <= 10:  # 只显示前10个没有图片的
                print(f"\n[{i}/{total_count}] 文章: {article.title[:50]}...")
                print(f"  ⚠ 正文中没有找到图片")
    
    print("\n" + "=" * 80)
    print(f"处理完成！")
    print(f"  - 总计检查: {total_count} 篇")
    print(f"  - 可以更新: {updated_count} 篇")
    print(f"  - 无图片: {no_image_count} 篇")
    
    if dry_run and updated_count > 0:
        print(f"\n💡 提示: 使用 --execute 参数来实际执行更新")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='从文章正文中提取封面图片',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 试运行，查看将要更新的文章
  python extract_cover_from_content.py
  
  # 试运行，只检查前10篇
  python extract_cover_from_content.py --limit 10
  
  # 实际执行更新
  python extract_cover_from_content.py --execute
  
  # 实际更新前100篇
  python extract_cover_from_content.py --execute --limit 100
        """
    )
    
    parser.add_argument(
        '--execute',
        action='store_true',
        help='实际执行更新（默认为试运行）'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='限制处理的文章数量'
    )
    
    parser.add_argument(
        '--slug',
        type=str,
        default=None,
        help='只处理指定 slug 的文章'
    )
    
    args = parser.parse_args()
    
    if args.slug:
        # 处理单篇文章
        try:
            article = Article.objects.get(slug=args.slug)
            print(f"处理文章: {article.title}")
            print(f"当前 image_url: {article.image_url}")
            
            first_image_url = extract_first_image_from_html(article.content)
            
            if first_image_url:
                print(f"提取到的图片: {first_image_url}")
                
                if args.execute:
                    article.image_url = first_image_url
                    article.save(update_fields=['image_url'])
                    print("✓ 已更新")
                else:
                    print("[试运行] 使用 --execute 来实际更新")
            else:
                print("⚠ 正文中没有找到图片")
                
        except Article.DoesNotExist:
            print(f"错误: 找不到 slug 为 '{args.slug}' 的文章")
            sys.exit(1)
    else:
        # 批量处理
        update_articles_with_missing_covers(
            dry_run=not args.execute,
            limit=args.limit
        )


if __name__ == '__main__':
    main()

