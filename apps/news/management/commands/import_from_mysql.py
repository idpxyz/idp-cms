"""
直接从旧MySQL数据库导入文章到Wagtail CMS
不需要先导出JSON文件，直接读取并导入

使用方法：
    # 测试模式
    python manage.py import_from_mysql --test --limit=10
    
    # 分批导入全部
    python manage.py import_from_mysql --batch-size=1000
    
    # 从指定位置继续
    python manage.py import_from_mysql --start-from=50000
"""

from django.core.management.base import BaseCommand
import pymysql
import time

class Command(BaseCommand):
    help = '直接从旧MySQL数据库导入文章'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mysql-host',
            type=str,
            default='121.41.73.49',
            help='MySQL主机地址'
        )
        parser.add_argument(
            '--mysql-port',
            type=int,
            default=3306,
            help='MySQL端口'
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
            help='MySQL数据库名'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='每批处理的文章数'
        )
        parser.add_argument(
            '--start-from',
            type=int,
            default=0,
            help='从第N篇开始导入（用于断点续传）'
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='限制导入数量（用于测试）'
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='测试模式：只导入前10条'
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        # 测试模式
        if options['test']:
            options['limit'] = 10
            self.stdout.write(self.style.WARNING('🧪 测试模式：只导入10条'))
        
        # 连接MySQL
        self.stdout.write('连接到MySQL数据库...')
        try:
            conn = pymysql.connect(
                host=options['mysql_host'],
                port=options['mysql_port'],
                user=options['mysql_user'],
                password=options['mysql_password'],
                database=options['mysql_database'],
                charset='utf8mb4'
            )
            self.stdout.write(self.style.SUCCESS('✓ MySQL连接成功'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ MySQL连接失败: {e}'))
            return
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询总数
        cursor.execute("SELECT COUNT(*) as total FROM article WHERE status = 1")
        total_count = cursor.fetchone()['total']
        self.stdout.write(f'数据库中共有 {total_count} 篇已发布文章')
        
        # 确定导入范围
        start_from = options['start_from']
        limit = options.get('limit') or total_count
        end_at = min(start_from + limit, total_count)
        
        self.stdout.write(f'将导入: {start_from} - {end_at} (共 {end_at - start_from} 篇)')
        self.stdout.write('')
        
        # 分批读取和导入
        batch_size = options['batch_size']
        current_offset = start_from
        imported_count = 0
        
        while current_offset < end_at:
            batch_limit = min(batch_size, end_at - current_offset)
            
            self.stdout.write(f'📦 读取批次: offset={current_offset}, limit={batch_limit}')
            
            # 读取一批数据
            sql = '''
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
                ORDER BY a.add_time DESC
                LIMIT %s OFFSET %s
            '''
            
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
            
            # 调用原有的import_old_articles命令处理这批数据
            from apps.news.management.commands.import_old_articles import Command as ImportCommand
            import_cmd = ImportCommand()
            
            # 临时保存数据
            import json
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(articles, f, ensure_ascii=False)
                temp_file = f.name
            
            # 调用导入
            try:
                import_cmd.handle(input_file=temp_file, **options)
                imported_count += len(articles)
            finally:
                import os
                os.unlink(temp_file)
            
            current_offset += batch_limit
            
            # 显示进度
            progress = (current_offset / total_count) * 100
            self.stdout.write(self.style.SUCCESS(
                f'✓ 进度: {imported_count}/{end_at-start_from} ({progress:.1f}%)'
            ))
            self.stdout.write('')
        
        cursor.close()
        conn.close()
        
        # 统计
        elapsed = time.time() - start_time
        self.stdout.write('')
        self.stdout.write('=' * 80)
        self.stdout.write(self.style.SUCCESS('✅ 导入完成！'))
        self.stdout.write(f'总用时: {elapsed/60:.1f} 分钟')
        self.stdout.write(f'成功导入: {imported_count} 篇')
        self.stdout.write('=' * 80)

