#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
全面分析新老数据库，提供Channel和Category组织方案

使用方法:
    python scripts/analyze_both_databases.py
"""

import json
from pathlib import Path
from collections import defaultdict, Counter

# 读取旧分类数据
old_categories_file = Path('data/migration/old_categories.txt')
old_categories = {}

with open(old_categories_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()[1:]  # 跳过表头
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) >= 4:
            cat_id = int(parts[0])
            name = parts[1]
            pid = int(parts[2]) if parts[2] not in ('NULL', '0') else None
            ordid = int(parts[3]) if parts[3] != 'NULL' else 0
            old_categories[cat_id] = {
                'id': cat_id,
                'name': name,
                'parent_id': pid,
                'order': ordid,
                'children': []
            }

# 构建树形结构
root_categories = []
for cat_id, cat in old_categories.items():
    if cat['parent_id'] and cat['parent_id'] in old_categories:
        old_categories[cat['parent_id']]['children'].append(cat_id)
    else:
        root_categories.append(cat_id)

print('=' * 100)
print('旧数据库 (MySQL) 深度分析')
print('=' * 100)
print(f'\n总分类数: {len(old_categories)}')
print(f'顶级分类: {len(root_categories)}')
print(f'有子分类的: {sum(1 for c in old_categories.values() if c["children"])}')

# 分析顶级分类及其子分类
print('\n' + '=' * 100)
print('顶级分类及其层级结构')
print('=' * 100)

def print_category_tree(cat_id, indent=0, stats=None):
    """打印分类树并统计"""
    if stats is None:
        stats = {'total': 0, 'max_depth': 0}
    
    cat = old_categories[cat_id]
    prefix = '  ' * indent + ('└─ ' if indent > 0 else '• ')
    
    # 统计
    stats['total'] += 1
    stats['max_depth'] = max(stats['max_depth'], indent)
    
    children_count = len(cat['children'])
    children_info = f' ({children_count} 个子分类)' if children_count > 0 else ''
    
    print(f'{prefix}{cat["name"]} [ID:{cat_id}]{children_info}')
    
    # 只显示前5个子分类
    for i, child_id in enumerate(cat['children'][:5]):
        print_category_tree(child_id, indent + 1, stats)
    
    if len(cat['children']) > 5:
        print('  ' * (indent + 1) + f'... 还有 {len(cat["children"]) - 5} 个子分类')
    
    return stats

# 按顶级分类分组分析
category_groups = {}

for root_id in sorted(root_categories):
    cat = old_categories[root_id]
    print(f'\n## {cat["name"]} [ID:{root_id}]')
    print('-' * 100)
    
    stats = {'total': 1, 'max_depth': 0}
    
    # 打印子分类
    for child_id in cat['children'][:10]:
        print_category_tree(child_id, 1, stats)
    
    if len(cat['children']) > 10:
        print(f'  ... 还有 {len(cat["children"]) - 10} 个子分类')
    
    category_groups[root_id] = {
        'name': cat['name'],
        'total_descendants': stats['total'],
        'max_depth': stats['max_depth'],
        'direct_children': len(cat['children'])
    }

# 统计分析
print('\n' + '=' * 100)
print('分类维度分析')
print('=' * 100)

# 按名称关键词分类
dimension_keywords = {
    '地理维度': {
        'keywords': ['武汉', '黄石', '十堰', '荆州', '宜昌', '襄阳', '鄂州', '荆门', '黄冈', '咸宁', '随州', '孝感'],
        'categories': []
    },
    '内容类型': {
        'keywords': ['新闻', '资讯', '专题', '网站', '网视', '视频'],
        'categories': []
    },
    '行业领域': {
        'keywords': ['经济', '金融', '证券', '理财', '投资', '商会', '房产'],
        'categories': []
    },
    '民生服务': {
        'keywords': ['民生', '健康', '医疗', '家居', '美食', '生活'],
        'categories': []
    },
    '文化娱乐': {
        'keywords': ['文化', '艺术', '书画', '娱乐', '音乐', '电影'],
        'categories': []
    },
    '其他领域': {
        'keywords': ['体育', '科技', '教育', '汽车', '旅游', '法制', '时政', '党建'],
        'categories': []
    }
}

for cat_id, cat in old_categories.items():
    matched = False
    for dimension, info in dimension_keywords.items():
        for keyword in info['keywords']:
            if keyword in cat['name']:
                info['categories'].append({'id': cat_id, 'name': cat['name']})
                matched = True
                break
        if matched:
            break

print('\n分类维度统计:')
print('-' * 100)
for dimension, info in dimension_keywords.items():
    count = len(info['categories'])
    pct = count / len(old_categories) * 100
    print(f'{dimension:15s}: {count:3d} 个分类 ({pct:5.1f}%)')
    
    # 显示示例
    examples = [c['name'] for c in info['categories'][:5]]
    if examples:
        print(f'                 示例: {", ".join(examples)}')

# 读取新系统结构
print('\n' + '=' * 100)
print('新系统 (PostgreSQL) 当前结构')
print('=' * 100)

new_structure_file = Path('data/migration/new_structure.json')
if new_structure_file.exists():
    with open(new_structure_file, 'r', encoding='utf-8') as f:
        content = f.read()
        # 跳过开头的日志信息
        json_start = content.find('{')
        if json_start > 0:
            content = content[json_start:]
        new_structure = json.loads(content)
    
    channels = new_structure.get('channels', [])
    categories = new_structure.get('categories', [])
    
    print(f'\n当前频道数: {len(channels)}')
    print('-' * 100)
    for ch in channels:
        print(f"  • {ch['name']:15s} (slug: {ch['slug']:15s}, order: {ch['order']})")
    
    print(f'\n当前分类数: {len(categories)}')
    if categories:
        print('-' * 100)
        for cat in categories:
            parent_info = f" -> 父分类ID:{cat['parent_id']}" if cat.get('parent_id') else ''
            print(f"  • {cat['name']:15s} (slug: {cat['slug']:15s}){parent_info}")
    else:
        print('  (当前没有分类)')

# 生成组织方案建议
print('\n' + '=' * 100)
print('📊 数据分析结论')
print('=' * 100)

print('''
1. 旧系统特点:
   - 476个分类，结构复杂，有明确的层级关系
   - 存在两个主要维度：
     a) 地理维度：大量地方性分类（武汉、黄石、十堰等）
     b) 内容维度：新闻类型分类（经济、文化、体育等）
   
2. 当前新系统:
   - 只有6个Channel（频道）
   - 没有Category（分类）
   - Channel设计较为宽泛

3. 核心问题:
   - 476 -> 6 的映射会丢失大量信息
   - 特别是地理信息和内容细分信息
''')

print('\n' + '=' * 100)
print('💡 推荐的组织方案')
print('=' * 100)

print('''
方案A: 双维度结构（推荐）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Channel（频道）- 按内容类型组织（保留并扩展现有）
├─ 新闻资讯 (news)           - 时政、社会、法制、党建
├─ 经济财经 (finance)        - 金融、证券、理财、投资、房产
├─ 文化娱乐 (culture)        - 文化、艺术、娱乐、书画
├─ 民生服务 (livelihood)     - 民生、健康、医疗、家居、美食
├─ 体育运动 (sports)         - 体育相关
├─ 科技数码 (tech)           - 科技、互联网
├─ 教育培训 (education)      - 教育相关（新增）
└─ 汽车旅游 (auto-travel)    - 汽车、旅游（新增）

Category（分类）- 按地区组织（充分利用现有Category功能）
├─ 湖北 (hubei)
│   ├─ 武汉 (wuhan)
│   ├─ 黄石 (huangshi)
│   ├─ 十堰 (shiyan)
│   ├─ 荆州 (jingzhou)
│   ├─ 宜昌 (yichang)
│   ├─ 襄阳 (xiangyang)
│   ├─ 鄂州 (ezhou)
│   ├─ 荆门 (jingmen)
│   ├─ 黄冈 (huanggang)
│   └─ 其他地市...
└─ 全国 (national)

使用示例:
  文章: "武汉楼市新政出台"
  - Channel: 经济财经
  - Category: 湖北 > 武汉

优点:
  ✓ 保留了内容类型信息（通过Channel）
  ✓ 保留了地理信息（通过Category）
  ✓ 灵活：一篇文章可以属于1个Channel + 多个Category
  ✓ 符合Wagtail的设计理念
  ✓ 便于前端展示和筛选

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

方案B: 扁平化结构（简单但信息丢失）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

只使用当前6个Channel，所有文章强制映射
- 优点: 简单，无需额外配置
- 缺点: 丢失70%的分类信息，特别是地理维度

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

方案C: 全量迁移（保留所有信息）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

创建476个Category，完整保留原有结构
- 优点: 零信息丢失
- 缺点: 过于复杂，不符合新系统设计理念
''')

# 生成具体实施文件
output = {
    'analysis': {
        'old_system': {
            'total_categories': len(old_categories),
            'root_categories': len(root_categories),
            'category_groups': category_groups
        },
        'dimensions': {
            dim: {
                'count': len(info['categories']),
                'percentage': len(info['categories']) / len(old_categories) * 100
            }
            for dim, info in dimension_keywords.items()
        }
    },
    'recommendations': {
        'plan_a': {
            'channels': [
                {'name': '新闻资讯', 'slug': 'news', 'description': '时政、社会、法制、党建'},
                {'name': '经济财经', 'slug': 'finance', 'description': '金融、证券、理财、投资、房产'},
                {'name': '文化娱乐', 'slug': 'culture', 'description': '文化、艺术、娱乐、书画'},
                {'name': '民生服务', 'slug': 'livelihood', 'description': '民生、健康、医疗、家居、美食'},
                {'name': '体育运动', 'slug': 'sports', 'description': '体育相关'},
                {'name': '科技数码', 'slug': 'tech', 'description': '科技、互联网'},
                {'name': '教育培训', 'slug': 'education', 'description': '教育相关'},
                {'name': '汽车旅游', 'slug': 'auto-travel', 'description': '汽车、旅游'},
            ],
            'categories': [
                {'name': '湖北', 'slug': 'hubei', 'parent': None},
                {'name': '武汉', 'slug': 'wuhan', 'parent': 'hubei'},
                {'name': '黄石', 'slug': 'huangshi', 'parent': 'hubei'},
                {'name': '十堰', 'slug': 'shiyan', 'parent': 'hubei'},
                {'name': '荆州', 'slug': 'jingzhou', 'parent': 'hubei'},
                {'name': '宜昌', 'slug': 'yichang', 'parent': 'hubei'},
                {'name': '襄阳', 'slug': 'xiangyang', 'parent': 'hubei'},
                {'name': '鄂州', 'slug': 'ezhou', 'parent': 'hubei'},
                {'name': '荆门', 'slug': 'jingmen', 'parent': 'hubei'},
                {'name': '黄冈', 'slug': 'huanggang', 'parent': 'hubei'},
                {'name': '咸宁', 'slug': 'xianning', 'parent': 'hubei'},
                {'name': '随州', 'slug': 'suizhou', 'parent': 'hubei'},
                {'name': '恩施', 'slug': 'enshi', 'parent': 'hubei'},
                {'name': '仙桃', 'slug': 'xiantao', 'parent': 'hubei'},
                {'name': '潜江', 'slug': 'qianjiang', 'parent': 'hubei'},
                {'name': '天门', 'slug': 'tianmen', 'parent': 'hubei'},
                {'name': '神农架', 'slug': 'shennongjia', 'parent': 'hubei'},
                {'name': '全国', 'slug': 'national', 'parent': None},
            ]
        }
    }
}

output_file = Path('data/migration/database_analysis_report.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'\n详细分析报告已保存到: {output_file}')

print('\n' + '=' * 100)
print('📝 下一步建议')
print('=' * 100)
print('''
1. 确定采用的方案（推荐方案A）

2. 在新系统中创建Channel和Category:
   docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell
   # 然后创建Channel和Category

3. 更新映射规则:
   - 编辑 category_mapping.json
   - 添加双维度映射逻辑

4. 测试导入:
   python manage.py import_old_articles --test --limit=100

5. 验证映射效果

需要我生成自动创建Channel和Category的脚本吗？
''')

print('=' * 100)

