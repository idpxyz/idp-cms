#!/usr/bin/env python3
"""
从旧MySQL数据库导出测试文章数据
"""
import pymysql
import json
import sys

# 数据库配置
DB_CONFIG = {
    'host': '121.41.73.49',
    'port': 3306,
    'user': 'jrhb',
    'password': '6VSPmPbuFGnZO1%C',
    'database': 'jrhb',
    'charset': 'utf8mb4'
}

def export_articles(limit=100):
    """导出文章数据"""
    try:
        # 连接数据库
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询文章
        sql = """
            SELECT 
                a.id,
                a.title,
                a.cate_id,
                a.img,
                a.add_time,
                a.last_time,
                a.author,
                a.tags,
                a.status,
                a.fromurl,
                a.seo_title,
                a.seo_desc,
                a.seo_keys,
                i.info
            FROM article a
            LEFT JOIN article_info i ON a.id = i.article_id
            WHERE a.status = 1
            ORDER BY a.id DESC
            LIMIT %s
        """
        
        cursor.execute(sql, (limit,))
        articles = cursor.fetchall()
        
        # 处理数据
        for article in articles:
            # 转换时间戳为整数
            if article['add_time']:
                article['add_time'] = int(article['add_time'])
            if article['last_time']:
                article['last_time'] = int(article['last_time'])
        
        cursor.close()
        conn.close()
        
        return articles
        
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return []

if __name__ == '__main__':
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    
    print(f"正在从MySQL导出 {limit} 条文章...", file=sys.stderr)
    articles = export_articles(limit)
    
    print(f"成功导出 {len(articles)} 条文章", file=sys.stderr)
    
    # 输出JSON到stdout
    print(json.dumps(articles, ensure_ascii=False, indent=2))

