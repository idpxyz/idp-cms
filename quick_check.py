#!/usr/bin/env python3
"""快速数据一致性检查脚本"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.append('/app')
django.setup()

from wagtail.models import Site
from apps.news.models import ArticlePage

def main():
    print("🔍 开始数据一致性检查...")
    print("\n=== Wagtail站点配置检查 ===")
    
    sites = Site.objects.all()
    root_pages = {}
    issues_found = False
    
    for site in sites:
        root_id = site.root_page_id
        article_count = ArticlePage.objects.live().descendant_of(site.root_page).count()
        
        print(f"\n📍 站点: {site.hostname}")
        print(f"   - ID: {site.id}")
        print(f"   - 根页面ID: {root_id}")
        print(f"   - 文章数量: {article_count}")
        
        if root_id in root_pages:
            print(f"❌ 问题发现：与站点 {root_pages[root_id]} 共享根页面！")
            issues_found = True
        else:
            root_pages[root_id] = site.hostname
            print("✅ 根页面配置正常")
    
    print(f"\n{'='*50}")
    if issues_found:
        print("⚠️  发现站点配置问题！")
    else:
        print("🎉 站点配置检查通过！")
    
    print("✅ 检查完成！")

if __name__ == "__main__":
    main()
