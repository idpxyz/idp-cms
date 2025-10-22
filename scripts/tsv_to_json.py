#!/usr/bin/env python3
"""
将TSV格式的文章数据转换为JSON
"""
import json
import sys

def tsv_to_json(tsv_file, json_file):
    """转换TSV到JSON"""
    
    # 字段名
    fields = [
        'id', 'title', 'cate_id', 'img', 'add_time', 'last_time',
        'author', 'tags', 'status', 'fromurl', 'seo_title', 
        'seo_desc', 'seo_keys', 'info'
    ]
    
    articles = []
    
    with open(tsv_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            try:
                # 分割字段（使用\t）
                values = line.rstrip('\n').split('\t')
                
                if len(values) != len(fields):
                    print(f"警告: 第{line_num}行字段数不匹配: {len(values)} vs {len(fields)}", file=sys.stderr)
                    # 填充缺失字段
                    while len(values) < len(fields):
                        values.append(None)
                
                # 构建字典
                article = {}
                for i, field in enumerate(fields):
                    value = values[i] if i < len(values) else None
                    
                    # 处理NULL
                    if value == 'NULL' or value == '\\N' or value == '':
                        value = None
                    
                    # 转换类型
                    if field in ['id', 'cate_id', 'add_time', 'last_time', 'status']:
                        if value is not None:
                            try:
                                value = int(value)
                            except (ValueError, TypeError):
                                value = None
                    
                    article[field] = value
                
                articles.append(article)
                
            except Exception as e:
                print(f"错误: 处理第{line_num}行时出错: {e}", file=sys.stderr)
                continue
    
    # 保存JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 成功转换 {len(articles)} 条记录", file=sys.stderr)
    print(f"   TSV: {tsv_file}", file=sys.stderr)
    print(f"   JSON: {json_file}", file=sys.stderr)
    
    return len(articles)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("用法: python3 tsv_to_json.py <input.tsv> <output.json>", file=sys.stderr)
        sys.exit(1)
    
    tsv_to_json(sys.argv[1], sys.argv[2])

