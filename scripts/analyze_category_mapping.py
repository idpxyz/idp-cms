#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分析旧数据库分类并生成映射建议

使用方法:
    python scripts/analyze_category_mapping.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

# 读取旧分类数据
old_categories_file = Path('data/migration/old_categories.txt')
mapping_file = Path('data/migration/category_mapping.json')

# 读取映射规则
with open(mapping_file, 'r', encoding='utf-8') as f:
    mapping_config = json.load(f)

# 解析旧分类文件
old_categories = {}
with open(old_categories_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()[1:]  # 跳过表头
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) >= 4:
            cat_id = int(parts[0])
            name = parts[1]
            pid = int(parts[2]) if parts[2] != 'NULL' else None
            ordid = int(parts[3]) if parts[3] != 'NULL' else 0
            old_categories[cat_id] = {
                'id': cat_id,
                'name': name,
                'parent_id': pid,
                'order': ordid
            }

print('=' * 80)
print('旧数据库分类映射分析')
print('=' * 80)
print(f'总分类数: {len(old_categories)}')
print()

# 统计分析
def get_target_channel(cat_id, cat_name):
    """根据分类ID和名称确定目标频道"""
    
    # 1. 优先使用详细映射
    detailed = mapping_config.get('detailed_mapping', {})
    if str(cat_id) in detailed:
        return detailed[str(cat_id)]['target_channel_id'], detailed[str(cat_id)]['target_channel']
    
    # 2. 使用名称规则
    rules = mapping_config.get('name_based_rules', {}).get('rules', [])
    for rule in rules:
        for keyword in rule['keywords']:
            if keyword in cat_name:
                return rule['target_channel_id'], rule['target_channel']
    
    # 3. 默认映射
    default = mapping_config.get('default_mapping', {})
    return default.get('channel_id', 2), default.get('slug', '社会')


# 按频道统计
channel_stats = defaultdict(lambda: {'count': 0, 'categories': []})

for cat_id, cat in old_categories.items():
    target_id, target_name = get_target_channel(cat_id, cat['name'])
    channel_stats[target_name]['count'] += 1
    channel_stats[target_name]['categories'].append({
        'id': cat_id,
        'name': cat['name'],
        'parent_id': cat['parent_id']
    })

# 打印统计
print('频道分布统计:')
print('-' * 80)
for channel, stats in sorted(channel_stats.items(), key=lambda x: x[1]['count'], reverse=True):
    print(f'{channel:12s}: {stats["count"]:4d} 个分类 ({stats["count"]/len(old_categories)*100:.1f}%)')

print()
print('=' * 80)
print('各频道映射的分类详情')
print('=' * 80)

for channel, stats in sorted(channel_stats.items()):
    print(f'\n## {channel} ({stats["count"]} 个分类)')
    print('-' * 80)
    
    # 显示前20个
    for cat in stats['categories'][:20]:
        parent_info = f' (父:{old_categories[cat["parent_id"]]["name"]})' if cat['parent_id'] and cat['parent_id'] in old_categories else ''
        print(f'  {cat["id"]:4d} | {cat["name"]:30s}{parent_info}')
    
    if len(stats['categories']) > 20:
        print(f'  ... 还有 {len(stats["categories"]) - 20} 个分类')

# 生成完整映射表
print('\n' + '=' * 80)
print('生成完整映射表')
print('=' * 80)

complete_mapping = {}
for cat_id, cat in old_categories.items():
    target_id, target_name = get_target_channel(cat_id, cat['name'])
    complete_mapping[str(cat_id)] = {
        'name': cat['name'],
        'parent_id': cat['parent_id'],
        'target_channel_id': target_id,
        'target_channel': target_name
    }

# 保存完整映射
output_file = Path('data/migration/category_mapping_complete.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump({
        'version': '1.0',
        'total_categories': len(old_categories),
        'mapping': complete_mapping,
        'statistics': {
            channel: stats['count'] 
            for channel, stats in channel_stats.items()
        }
    }, f, ensure_ascii=False, indent=2)

print(f'完整映射表已保存到: {output_file}')

# 生成导入脚本可用的映射字典
print('\n' + '=' * 80)
print('生成Python映射字典')
print('=' * 80)

print('\n# 复制以下代码到导入脚本中:')
print('CATEGORY_TO_CHANNEL_MAPPING = {')
for cat_id in sorted(complete_mapping.keys(), key=lambda x: int(x))[:30]:
    mapping = complete_mapping[cat_id]
    print(f'    {cat_id}: {mapping["target_channel_id"]},  # {mapping["name"]} -> {mapping["target_channel"]}')
print('    # ... 更多映射')
print('}')

print('\n' + '=' * 80)
print('分析完成！')
print('=' * 80)
print(f'\n文件位置:')
print(f'  - 映射规则: {mapping_file}')
print(f'  - 完整映射表: {output_file}')
print(f'\n建议:')
print('  1. 检查 category_mapping_complete.json 确认映射是否合理')
print('  2. 如需调整，修改 category_mapping.json 后重新运行本脚本')
print('  3. 确认无误后，可以开始数据导入')

