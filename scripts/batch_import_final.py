
#!/usr/bin/env python3
"""
本地运行的批量导入脚本
连接MySQL并通过SSH调用远程Django命令导入

使用方法：
    python3 scripts/batch_import_final.py
"""

import pymysql
import json
import subprocess
import tempfile
import os
import time
from pathlib import Path

# 配置
MYSQL_CONFIG = {
    'host': '121.41.73.49',
    'port': 3306,
    'user': 'jrhb',
    'password': '6VSPmPbuFGnZO1%C',
    'database': 'jrhb',
    'charset': 'utf8mb4'
}

REMOTE_HOST = 'root@121.40.167.71'
REMOTE_DIR = '/opt/idp-cms'
BATCH_SIZE = 1000
IMPORT_BATCH_SIZE = 500

def main():
    print('=' * 80)
    print('📦 开始批量导入文章')
    print('=' * 80)
    print()
    
    start_time = time.time()
    
    # 连接MySQL
    print('连接MySQL数据库...')
    try:
        conn = pymysql.connect(**MYSQL_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        print('✓ MySQL连接成功')
    except Exception as e:
        print(f'✗ MySQL连接失败: {e}')
        return
    
    # 查询总数
    cursor.execute("SELECT COUNT(*) as total FROM article WHERE status = 1")
    total = cursor.fetchone()['total']
    print(f'✓ 总文章数: {total:,}')
    print()
    
    # 统计
    stats = {
        'total': 0,
        'success': 0,
        'failed': 0,
        'batches': 0
    }
    
    # 分批处理
    offset = 0
    while offset < total:
        batch_limit = min(BATCH_SIZE, total - offset)
        stats['batches'] += 1
        
        print(f'📦 批次 {stats["batches"]} | Offset: {offset:,} | Size: {batch_limit}')
        
        try:
            # 查询一批数据
            sql = """
                SELECT 
                    a.id, a.title, a.cate_id, a.img, a.add_time, a.last_time,
                    a.author, a.tags, a.status, a.fromurl, a.seo_title,
                    a.seo_desc, a.seo_keys, i.info
                FROM article a
                LEFT JOIN article_info i ON a.id = i.article_id
                WHERE a.status = 1
                ORDER BY a.add_time DESC
                LIMIT %s OFFSET %s
            """
            
            cursor.execute(sql, (batch_limit, offset))
            articles = cursor.fetchall()
            
            if not articles:
                print('✓ 没有更多数据')
                break
            
            # 处理时间戳
            for article in articles:
                if article['add_time']:
                    article['add_time'] = int(article['add_time'])
                if article['last_time']:
                    article['last_time'] = int(article['last_time'])
            
            # 保存到临时文件
            temp_file = f'/tmp/batch_{stats["batches"]}.json'
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(articles, f, ensure_ascii=False, indent=2)
            
            # 上传到远程服务器
            remote_file = f'{REMOTE_DIR}/data/migration/exports/batch_{stats["batches"]}.json'
            upload_cmd = f'scp {temp_file} {REMOTE_HOST}:{remote_file}'
            subprocess.run(upload_cmd, shell=True, check=True, capture_output=True)
            
            # 远程导入
            import_cmd = (
                f'ssh {REMOTE_HOST} "cd {REMOTE_DIR} && '
                f'docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring '
                f'python manage.py import_old_articles '
                f'--file={remote_file} '
                f'--batch-size={IMPORT_BATCH_SIZE} '
                f'--skip-inline-images"'
            )
            
            result = subprocess.run(import_cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                stats['success'] += len(articles)
                print(f'✓ 批次完成: {len(articles)} 篇')
            else:
                stats['failed'] += len(articles)
                print(f'✗ 批次失败: {result.stderr[:200]}')
            
            # 清理
            os.unlink(temp_file)
            cleanup_cmd = f'ssh {REMOTE_HOST} "rm -f {remote_file}"'
            subprocess.run(cleanup_cmd, shell=True, capture_output=True)
            
            stats['total'] += len(articles)
            offset += batch_limit
            
            # 显示进度
            progress = (stats['total'] / total) * 100
            elapsed = time.time() - start_time
            avg_speed = stats['total'] / elapsed if elapsed > 0 else 0
            remaining = (total - stats['total']) / avg_speed if avg_speed > 0 else 0
            
            print(f'进度: {stats["total"]:,}/{total:,} ({progress:.1f}%) | '
                  f'速度: {avg_speed:.1f} 篇/秒 | '
                  f'剩余: {remaining/3600:.1f} 小时')
            print()
            
        except Exception as e:
            print(f'✗ 批次处理失败: {e}')
            stats['failed'] += batch_limit
            offset += batch_limit
            continue
    
    cursor.close()
    conn.close()
    
    # 总结
    elapsed = time.time() - start_time
    print()
    print('=' * 80)
    print('✅ 导入完成')
    print('=' * 80)
    print(f'总用时: {elapsed/3600:.2f} 小时')
    print(f'总批次: {stats["batches"]}')
    print(f'成功: {stats["success"]:,} 篇')
    print(f'失败: {stats["failed"]:,} 篇')
    print(f'平均速度: {stats["total"]/elapsed:.1f} 篇/秒')
    print('=' * 80)

if __name__ == '__main__':
    main()

