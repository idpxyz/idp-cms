#!/usr/bin/env python3
"""
从文章正文中提取封面图片 - 使用 API 版本
用于修复那些正文中有图片但缺少封面图的文章
"""

import re
import sys
import requests
import argparse
from typing import Optional


def extract_first_image_from_html(html_content: str) -> Optional[str]:
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


def get_article(api_base: str, slug: str) -> Optional[dict]:
    """
    通过 API 获取文章详情
    """
    url = f"{api_base}/api/articles/{slug}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('data')
        else:
            print(f"错误: API 返回状态码 {response.status_code}")
            return None
    except Exception as e:
        print(f"错误: 无法获取文章 - {e}")
        return None


def update_article_cover(api_base: str, article_id: int, image_url: str, dry_run: bool = True) -> bool:
    """
    通过 API 更新文章封面
    """
    url = f"{api_base}/api/admin/articles/{article_id}"
    
    if dry_run:
        print(f"  [试运行] 将会更新 API: PATCH {url}")
        print(f"  [试运行] 数据: {{'image_url': '{image_url}'}}")
        return True
    
    try:
        response = requests.patch(
            url,
            json={'image_url': image_url},
            timeout=10
        )
        if response.status_code in [200, 204]:
            return True
        else:
            print(f"  ✗ 更新失败: API 返回状态码 {response.status_code}")
            print(f"  响应: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  ✗ 更新失败: {e}")
        return False


def process_article(api_base: str, slug: str, dry_run: bool = True):
    """
    处理单篇文章
    """
    print(f"正在获取文章: {slug}")
    print(f"API: {api_base}")
    print("-" * 80)
    
    # 获取文章详情
    article = get_article(api_base, slug)
    
    if not article:
        print("✗ 无法获取文章")
        return False
    
    print(f"文章标题: {article.get('title', 'N/A')}")
    print(f"文章 ID: {article.get('id', 'N/A')}")
    print(f"当前封面: {article.get('image_url') or '(无)'}")
    
    # 检查是否已有封面
    if article.get('image_url'):
        print("✓ 文章已有封面图，无需更新")
        return True
    
    # 从正文中提取图片
    content = article.get('content', '')
    first_image = extract_first_image_from_html(content)
    
    if not first_image:
        print("⚠ 正文中没有找到图片")
        return False
    
    print(f"\n提取到的图片:")
    print(f"  {first_image}")
    
    # 更新文章
    if article.get('id'):
        success = update_article_cover(
            api_base,
            article['id'],
            first_image,
            dry_run=dry_run
        )
        
        if success:
            if dry_run:
                print(f"\n✓ [试运行] 检查通过")
                print(f"💡 使用 --execute 参数来实际执行更新")
            else:
                print(f"\n✓ 更新成功！")
            return True
    
    return False


def list_articles_without_covers(api_base: str, limit: int = 10):
    """
    列出没有封面图的文章
    """
    url = f"{api_base}/api/news"
    params = {'size': 100, 'page': 1}
    
    print(f"正在获取文章列表...")
    print("-" * 80)
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            print(f"错误: API 返回状态码 {response.status_code}")
            return
        
        data = response.json()
        articles = data.get('data', [])
        
        count = 0
        for article in articles:
            if not article.get('image_url') and count < limit:
                count += 1
                print(f"\n[{count}] {article.get('title', 'N/A')[:60]}...")
                print(f"    Slug: {article.get('slug', 'N/A')}")
                print(f"    ID: {article.get('id', 'N/A')}")
        
        if count == 0:
            print("✓ 没有找到缺少封面的文章")
        else:
            print(f"\n共找到 {count} 篇缺少封面的文章（显示前 {limit} 篇）")
            
    except Exception as e:
        print(f"错误: {e}")


def main():
    parser = argparse.ArgumentParser(
        description='从文章正文中提取封面图片（API 版本）',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 检查特定文章（试运行）
  python extract_cover_from_content_api.py --slug chen-mo-de-rong-223603
  
  # 实际更新特定文章
  python extract_cover_from_content_api.py --slug chen-mo-de-rong-223603 --execute
  
  # 列出没有封面的文章
  python extract_cover_from_content_api.py --list
  
  # 使用自定义 API 地址
  python extract_cover_from_content_api.py --api http://localhost:8000 --slug your-slug
        """
    )
    
    parser.add_argument(
        '--api',
        type=str,
        default='http://8.133.22.7',
        help='API 基础地址（默认: http://8.133.22.7）'
    )
    
    parser.add_argument(
        '--slug',
        type=str,
        help='要处理的文章 slug'
    )
    
    parser.add_argument(
        '--execute',
        action='store_true',
        help='实际执行更新（默认为试运行）'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='列出没有封面图的文章'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='列表模式下显示的最大数量（默认: 10）'
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_articles_without_covers(args.api, args.limit)
    elif args.slug:
        process_article(args.api, args.slug, dry_run=not args.execute)
    else:
        parser.print_help()
        print("\n提示: 使用 --slug 指定文章，或使用 --list 查看缺少封面的文章")
        sys.exit(1)


if __name__ == '__main__':
    main()

