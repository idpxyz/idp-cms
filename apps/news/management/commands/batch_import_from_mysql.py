"""
直接从MySQL分批导入文章
避免TSV格式问题，直接在内存中处理

使用方法：
    python manage.py batch_import_from_mysql --batch-size=1000
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
import pymysql
import json
import tempfile
import os
import time
from pathlib import Path

class Command(BaseCommand):
    help = '直接从MySQL分批导入文章（避免文件格式问题）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mysql-host',
            type=str,
            default='121.41.73.49',
            help='MySQL主机'
        )
        parser.add_argument(
            '--mysql-user',
            type=str,
            default='jrhb',
            help='MySQL用户名'
        )
        parser.add_argument(
            '--mysql-password',
            type=str,
            default='6VSPmPbuFGnZO1%C',
            help='MySQL密码'
        )
        parser.add_argument(
            '--mysql-database',
            type=str,
            default='jrhb',
            help='MySQL数据库'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='每批处理数量'
        )
        parser.add_argument(
            '--import-batch-size',
            type=int,
            default=500,
            help='导入命令的batch-size'
        )
        parser.add_argument(
            '--start-from',
            type=int,
            default=0,
            help='从第N篇开始'
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='限制总数'
        )
        parser.add_argument(
            '--skip-inline-images',
            action='store_true',
            help='跳过正文图片'
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        self.stdout.write('=' * 80)
        self.stdout.write(self.style.SUCCESS('📦 开始分批导入'))
        self.stdout.write('=' * 80)
        self.stdout.write('')
        
        # 连接MySQL
        self.stdout.write('连接MySQL...')
        try:
            conn = pymysql.connect(
                host=options['mysql_host'],
                port=3306,
                user=options['mysql_user'],
                password=options['mysql_password'],
                database=options['mysql_database'],
                charset='utf8mb4'
            )
            self.stdout.write(self.style.SUCCESS('✓ MySQL连接成功'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ 连接失败: {e}'))
            return
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询总数
        cursor.execute("SELECT COUNT(*) as total FROM article WHERE status = 1")
        total = cursor.fetchone()['total']
        self.stdout.write(f'总文章数: {total}')
        self.stdout.write('')
        
        # 确定范围
        start = options['start_from']
        limit = options.get('limit') or total
        end = min(start + limit, total)
        batch_size = options['batch_size']
        
        # 统计
        stats = {
            'total_processed': 0,
            'total_success': 0,
            'total_failed': 0,
            'batches': 0
        }
        
        # 分批处理
        current_offset = start
        while current_offset < end:
            batch_limit = min(batch_size, end - current_offset)
            stats['batches'] += 1
            
            self.stdout.write(f'📦 批次 {stats["batches"]} | Offset: {current_offset} | Size: {batch_limit}')
            
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
            
            try:
                cursor.execute(sql, (batch_limit, current_offset))
                articles = cursor.fetchall()
                
                if not articles:
                    break
                
                # 处理时间戳
                for article in articles:
                    if article['add_time']:
                        article['add_time'] = int(article['add_time'])
                    if article['last_time']:
                        article['last_time'] = int(article['last_time'])
                
                # 保存到临时JSON文件
                temp_file = None
                try:
                    with tempfile.NamedTemporaryFile(
                        mode='w',
                        suffix='.json',
                        delete=False,
                        encoding='utf-8'
                    ) as f:
                        json.dump(articles, f, ensure_ascii=False, indent=2)
                        temp_file = f.name
                    
                    # 调用导入命令
                    import_options = {
                        'file': temp_file,
                        'batch_size': options['import_batch_size'],
                        'skip_inline_images': options.get('skip_inline_images', False),
                        'old_site_url': 'http://www.hubeitoday.com.cn',
                        'old_media_path': '/data/webapp/www/file.hubeitoday.com.cn/public',
                        'force_download': False,
                    }
                    
                    call_command('import_old_articles', **import_options)
                    
                    stats['total_success'] += len(articles)
                    self.stdout.write(self.style.SUCCESS(
                        f'✓ 批次完成: {len(articles)} 篇'
                    ))
                    
                except Exception as e:
                    stats['total_failed'] += len(articles)
                    self.stdout.write(self.style.ERROR(f'✗ 批次失败: {e}'))
                
                finally:
                    # 清理临时文件
                    if temp_file and os.path.exists(temp_file):
                        os.unlink(temp_file)
                
                stats['total_processed'] += len(articles)
                current_offset += batch_limit
                
                # 显示进度
                progress = (stats['total_processed'] / (end - start)) * 100
                elapsed = time.time() - start_time
                avg_speed = stats['total_processed'] / elapsed if elapsed > 0 else 0
                remaining = (end - start - stats['total_processed']) / avg_speed if avg_speed > 0 else 0
                
                self.stdout.write(
                    f'进度: {stats["total_processed"]}/{end-start} '
                    f'({progress:.1f}%) | '
                    f'速度: {avg_speed:.1f} 篇/秒 | '
                    f'剩余: {remaining/3600:.1f} 小时'
                )
                self.stdout.write('')
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'批次查询失败: {e}'))
                break
        
        cursor.close()
        conn.close()
        
        # 总结
        elapsed = time.time() - start_time
        self.stdout.write('')
        self.stdout.write('=' * 80)
        self.stdout.write(self.style.SUCCESS('✅ 导入完成'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'总用时: {elapsed/3600:.2f} 小时')
        self.stdout.write(f'总批次: {stats["batches"]}')
        self.stdout.write(f'成功: {stats["total_success"]} 篇')
        self.stdout.write(f'失败: {stats["total_failed"]} 篇')
        self.stdout.write(f'平均速度: {stats["total_processed"]/elapsed:.1f} 篇/秒')
        self.stdout.write('=' * 80)

