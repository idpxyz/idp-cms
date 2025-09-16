#!/usr/bin/env python3
"""
创建测试分类数据的脚本
"""
import os
import sys
import django

# 设置Django环境
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from core.models import Category, Channel
from wagtailcore.models import Site

def create_test_categories():
    """创建测试分类数据"""
    try:
        # 获取默认站点
        site = Site.objects.get(is_default_site=True)
        print(f"Using site: {site}")
        
        # 创建一级分类
        categories_data = [
            {'name': '科技', 'slug': 'tech', 'description': '科技新闻和产品资讯', 'order': 1},
            {'name': '财经', 'slug': 'finance', 'description': '经济金融新闻', 'order': 2},
            {'name': '体育', 'slug': 'sports', 'description': '体育赛事和新闻', 'order': 3},
            {'name': '娱乐', 'slug': 'entertainment', 'description': '娱乐圈资讯', 'order': 4},
            {'name': '社会', 'slug': 'society', 'description': '社会新闻', 'order': 5},
        ]
        
        # 创建分类
        created_categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description'],
                    'order': cat_data['order'],
                    'is_active': True,
                }
            )
            if created:
                print(f"Created category: {category.name} ({category.slug})")
            else:
                print(f"Category already exists: {category.name} ({category.slug})")
            
            # 添加站点关系
            category.sites.add(site)
            created_categories.append(category)
        
        # 创建一些二级分类
        subcategories_data = [
            {'name': '人工智能', 'slug': 'ai', 'parent': 'tech', 'description': 'AI和机器学习', 'order': 1},
            {'name': '区块链', 'slug': 'blockchain', 'parent': 'tech', 'description': '区块链技术', 'order': 2},
            {'name': '股市', 'slug': 'stock', 'parent': 'finance', 'description': '股市动态', 'order': 1},
            {'name': '足球', 'slug': 'football', 'parent': 'sports', 'description': '足球新闻', 'order': 1},
            {'name': '电影', 'slug': 'movies', 'parent': 'entertainment', 'description': '电影资讯', 'order': 1},
        ]
        
        for subcat_data in subcategories_data:
            # 找到父分类
            parent_category = Category.objects.filter(slug=subcat_data['parent']).first()
            if parent_category:
                subcategory, created = Category.objects.get_or_create(
                    slug=subcat_data['slug'],
                    defaults={
                        'name': subcat_data['name'],
                        'description': subcat_data['description'],
                        'parent': parent_category,
                        'order': subcat_data['order'],
                        'is_active': True,
                    }
                )
                if created:
                    print(f"Created subcategory: {subcategory.name} ({subcategory.slug}) under {parent_category.name}")
                else:
                    print(f"Subcategory already exists: {subcategory.name} ({subcategory.slug})")
                
                # 添加站点关系
                subcategory.sites.add(site)
        
        print(f"\nTotal categories created: {Category.objects.count()}")
        print("Categories:")
        for cat in Category.objects.all().order_by('parent_id', 'order'):
            indent = "  " if cat.parent else ""
            print(f"{indent}- {cat.name} ({cat.slug}) - Active: {cat.is_active}")
            
    except Exception as e:
        print(f"Error creating categories: {e}")
        return False
    
    return True

if __name__ == '__main__':
    success = create_test_categories()
    if success:
        print("\n✅ Test categories created successfully!")
    else:
        print("\n❌ Failed to create test categories")
        sys.exit(1)
