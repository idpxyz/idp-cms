"""
设置简化的 OpenSearch 索引结构
适合新项目的一键初始化命令
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.searchapp.simple_index import (
    ensure_index, 
    get_index_name, 
    get_index_info,
    ARTICLE_MAPPING
)
from apps.searchapp.client import get_client
from wagtail.models import Site
import json


class Command(BaseCommand):
    help = '设置简化的 OpenSearch 索引结构'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            help='指定站点（默认为所有站点）'
        )
        parser.add_argument(
            '--force-recreate',
            action='store_true',
            help='强制重建索引（⚠️ 会删除现有数据）'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预览操作，不实际执行'
        )
        parser.add_argument(
            '--show-mapping',
            action='store_true',
            help='显示完整的映射定义'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 OpenSearch 简化索引设置工具')
        )
        
        if options['show_mapping']:
            self._show_mapping()
            return
        
        # 获取要处理的站点列表
        sites = self._get_sites(options['site'])
        
        for site in sites:
            self._process_site(site, options)

    def _show_mapping(self):
        """显示映射定义"""
        self.stdout.write(self.style.WARNING('\n📋 索引映射定义：'))
        print(json.dumps(ARTICLE_MAPPING, indent=2, ensure_ascii=False))

    def _get_sites(self, site_filter=None):
        """获取站点列表"""
        if site_filter:
            return [site_filter]
        
        # 获取所有 Wagtail 站点
        sites = [settings.SITE_HOSTNAME]  # 默认站点
        try:
            wagtail_sites = Site.objects.all()
            sites.extend([site.hostname for site in wagtail_sites])
            sites = list(set(sites))  # 去重
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️ 无法获取 Wagtail 站点: {e}')
            )
        
        return sites

    def _process_site(self, site, options):
        """处理单个站点"""
        self.stdout.write(f'\n🌐 处理站点: {site}')
        
        # 获取索引信息
        index_name = get_index_name(site)
        info = get_index_info(site)
        
        self.stdout.write(f'   索引名称: {index_name}')
        
        if info.get('error'):
            self.stdout.write(
                self.style.ERROR(f'   ❌ 错误: {info["error"]}')
            )
            return
        
        exists = info['exists']
        doc_count = info['doc_count']
        
        if exists:
            self.stdout.write(
                self.style.WARNING(f'   📊 现有文档数: {doc_count}')
            )
        else:
            self.stdout.write('   📋 索引不存在')
        
        # 处理逻辑
        if options['dry_run']:
            self._dry_run_preview(site, exists, doc_count, options)
        else:
            self._execute_setup(site, exists, doc_count, options)

    def _dry_run_preview(self, site, exists, doc_count, options):
        """预览模式"""
        self.stdout.write(self.style.WARNING('   🔍 预览模式 - 不会实际执行'))
        
        if options['force_recreate'] and exists:
            self.stdout.write('   🗑️  将删除现有索引')
            self.stdout.write(f'   ⚠️  将丢失 {doc_count} 个文档')
        
        if not exists or options['force_recreate']:
            self.stdout.write('   ✨ 将创建新索引')
            self.stdout.write('   📋 将应用完整映射')

    def _execute_setup(self, site, exists, doc_count, options):
        """执行设置"""
        client = get_client()
        index_name = get_index_name(site)
        
        # 处理重建
        if options['force_recreate'] and exists:
            if doc_count > 0:
                confirm = input(
                    f'⚠️  确认删除 {doc_count} 个文档？输入 "DELETE" 确认: '
                )
                if confirm != 'DELETE':
                    self.stdout.write(
                        self.style.ERROR('   ❌ 操作取消')
                    )
                    return
            
            try:
                client.indices.delete(index=index_name)
                self.stdout.write(
                    self.style.SUCCESS('   🗑️  删除旧索引成功')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'   ❌ 删除失败: {e}')
                )
                return
        
        # 创建或更新索引
        try:
            if not client.indices.exists(index=index_name):
                # 创建新索引
                client.indices.create(index=index_name, body=ARTICLE_MAPPING)
                self.stdout.write(
                    self.style.SUCCESS('   ✨ 创建索引成功')
                )
            else:
                # 更新映射
                client.indices.put_mapping(
                    index=index_name,
                    body=ARTICLE_MAPPING["mappings"]
                )
                self.stdout.write(
                    self.style.SUCCESS('   📋 更新映射成功')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'   ❌ 操作失败: {e}')
            )
            return
        
        # 验证结果
        final_info = get_index_info(site)
        if final_info['exists']:
            self.stdout.write(
                self.style.SUCCESS(f'   ✅ 验证成功: {final_info["doc_count"]} 文档')
            )
        else:
            self.stdout.write(
                self.style.ERROR('   ❌ 验证失败')
            )

    def _migration_tips(self):
        """显示迁移提示"""
        tips = """
🔧 迁移提示：

1. 新项目设置：
   python manage.py setup_simple_index

2. 查看映射：
   python manage.py setup_simple_index --show-mapping

3. 预览操作：
   python manage.py setup_simple_index --dry-run

4. 重建特定站点：
   python manage.py setup_simple_index --site example.com --force-recreate

5. 批量重建数据：
   python manage.py rebuild_search_index

📚 简化架构优势：
- 直接索引命名，无复杂别名
- 映射与模型完全对齐  
- 运维简单，适合新项目
- 支持多站点，按需扩展
"""
        self.stdout.write(tips)
