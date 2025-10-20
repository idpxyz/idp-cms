"""
生成完整的分类映射表

从旧MySQL数据库读取所有分类，根据category_mapping_v2.json的规则，
生成category_mapping_complete.json供导入脚本使用
"""

import json
import re
from pathlib import Path

def load_old_categories():
    """加载旧数据库的分类数据"""
    categories_file = Path('data/migration/exports/categories.json')
    if not categories_file.exists():
        print(f"❌ 文件不存在: {categories_file}")
        print("请先运行导出脚本导出分类数据")
        return None
    
    with open(categories_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_mapping_rules():
    """加载映射规则"""
    rules_file = Path('data/migration/category_mapping_v2.json')
    if not rules_file.exists():
        print(f"❌ 文件不存在: {rules_file}")
        return None
    
    with open(rules_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def match_by_name(category_name, name_rules):
    """根据名称匹配规则"""
    for rule in name_rules['rules']:
        for keyword in rule['keywords']:
            if keyword in category_name:
                return {
                    'target_channel_id': rule['target_channel_id'],
                    'target_channel': rule['target_channel'],
                    'match_method': 'name_keyword',
                    'matched_keyword': keyword
                }
    return None

def generate_complete_mapping():
    """生成完整映射表"""
    print("=" * 80)
    print("生成完整的分类映射表")
    print("=" * 80)
    
    # 加载数据
    old_categories = load_old_categories()
    if not old_categories:
        return False
    
    mapping_rules = load_mapping_rules()
    if not mapping_rules:
        return False
    
    print(f"\n📊 数据统计:")
    print(f"  旧分类总数: {len(old_categories)}")
    
    # 提取规则
    detailed_mapping = mapping_rules['detailed_mapping']
    name_rules = mapping_rules['name_based_rules']
    default_mapping = mapping_rules['mapping_rules']['default_mapping']
    
    # 生成完整映射
    complete_mapping = {}
    stats = {
        'direct_match': 0,  # 直接匹配（在detailed_mapping中）
        'name_match': 0,    # 名称匹配（通过关键词）
        'default_match': 0,  # 默认映射
    }
    
    for category in old_categories:
        cate_id = str(category['id'])
        cate_name = category['name']
        
        # 优先使用详细映射
        if cate_id in detailed_mapping:
            mapping = detailed_mapping[cate_id]
            complete_mapping[cate_id] = {
                'old_id': category['id'],
                'old_name': cate_name,
                'old_pid': category.get('pid'),
                'target_channel_id': mapping['target_channel_id'],
                'target_channel': mapping['target_channel'],
                'match_method': 'direct',
                'is_local': mapping.get('is_local', False),
                'region': mapping.get('region', '')
            }
            stats['direct_match'] += 1
        
        # 尝试名称匹配
        else:
            name_match = match_by_name(cate_name, name_rules)
            if name_match:
                complete_mapping[cate_id] = {
                    'old_id': category['id'],
                    'old_name': cate_name,
                    'old_pid': category.get('pid'),
                    'target_channel_id': name_match['target_channel_id'],
                    'target_channel': name_match['target_channel'],
                    'match_method': 'name_keyword',
                    'matched_keyword': name_match['matched_keyword'],
                    'is_local': False,
                    'region': ''
                }
                stats['name_match'] += 1
            
            # 使用默认映射
            else:
                complete_mapping[cate_id] = {
                    'old_id': category['id'],
                    'old_name': cate_name,
                    'old_pid': category.get('pid'),
                    'target_channel_id': default_mapping['channel_id'],
                    'target_channel': default_mapping['channel_name'],
                    'match_method': 'default',
                    'is_local': False,
                    'region': ''
                }
                stats['default_match'] += 1
    
    # 保存结果
    output_file = Path('data/migration/category_mapping_complete.json')
    output_data = {
        'version': '2.0',
        'generated_at': '2025-10-20',
        'source_rules': 'category_mapping_v2.json',
        'total_categories': len(old_categories),
        'statistics': stats,
        'mapping': complete_mapping
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 映射生成完成!")
    print(f"\n📈 映射统计:")
    print(f"  直接映射: {stats['direct_match']} 个")
    print(f"  名称匹配: {stats['name_match']} 个")
    print(f"  默认映射: {stats['default_match']} 个")
    print(f"  总计: {sum(stats.values())} 个")
    
    print(f"\n💾 保存到: {output_file}")
    
    # 按Channel统计
    print(f"\n📊 按Channel统计:")
    channel_stats = {}
    for mapping in complete_mapping.values():
        channel_name = mapping['target_channel']
        channel_stats[channel_name] = channel_stats.get(channel_name, 0) + 1
    
    for channel_name in sorted(channel_stats.keys(), key=lambda x: channel_stats[x], reverse=True):
        count = channel_stats[channel_name]
        print(f"  {channel_name:12s}: {count:3d} 个分类")
    
    print("\n" + "=" * 80)
    print("✅ 完成！可以开始导入文章了")
    print("=" * 80)
    
    return True

if __name__ == '__main__':
    generate_complete_mapping()

