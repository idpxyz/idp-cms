from django.core.management.base import BaseCommand
from django.core.exceptions import ValidationError
from apps.core.models import ChannelTemplate


class Command(BaseCommand):
    help = '同步频道模板文件到数据库'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示需要同步的文件，不实际创建',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='强制更新已存在的模板记录',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write('🔍 扫描模板文件...')
        
        template_files = ChannelTemplate.scan_template_files()
        
        if not template_files:
            self.stdout.write(
                self.style.WARNING('未找到任何模板文件')
            )
            return
        
        self.stdout.write(f'📁 找到 {len(template_files)} 个模板文件:\n')
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for template_info in template_files:
            file_name = template_info['file_name']
            slug = template_info['slug']
            name = template_info['name']
            exists_in_db = template_info['exists_in_db']
            
            status_icon = '✅' if exists_in_db else '🆕'
            self.stdout.write(f'  {status_icon} {file_name} -> {name} ({slug})')
            
            if dry_run:
                continue
            
            try:
                template, created = ChannelTemplate.objects.get_or_create(
                    file_name=file_name,
                    defaults={
                        'name': name,
                        'slug': slug,
                        'description': f'自动同步的{name}',
                        'category': self._guess_category(slug),
                        'order': self._guess_order(slug),
                        'is_default': slug == 'default',
                    }
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'    ✅ 创建: {template.name}')
                    )
                    created_count += 1
                elif force:
                    # 更新现有记录
                    template.name = name
                    template.slug = slug
                    template.description = f'自动同步的{name}'
                    template.save()
                    self.stdout.write(
                        self.style.WARNING(f'    🔄 更新: {template.name}')
                    )
                    updated_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(f'    ⏭️  跳过: {template.name} (已存在)')
                    )
                    skipped_count += 1
                    
            except ValidationError as e:
                self.stdout.write(
                    self.style.ERROR(f'    ❌ 创建失败: {e}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'    ❌ 意外错误: {e}')
                )
        
        if dry_run:
            self.stdout.write('\n🔍 这是预览模式，未实际创建任何记录')
            self.stdout.write('使用 --force 参数执行实际同步')
        else:
            self.stdout.write(f'\n📊 同步完成:')
            self.stdout.write(f'  🆕 创建: {created_count}')
            self.stdout.write(f'  🔄 更新: {updated_count}')
            self.stdout.write(f'  ⏭️  跳过: {skipped_count}')
        
        # 检查数据库中的孤立记录
        self._check_orphaned_templates()
    
    def _guess_category(self, slug):
        """根据slug猜测模板分类"""
        category_mapping = {
            'default': 'news',
            'social': 'lifestyle',
            'culture': 'lifestyle',
            'tech': 'business',
            'sports': 'entertainment',
            'finance': 'business',
            'entertainment': 'entertainment',
            'politics': 'news',
            'health': 'lifestyle',
        }
        return category_mapping.get(slug, 'news')
    
    def _guess_order(self, slug):
        """根据slug猜测排序顺序"""
        order_mapping = {
            'default': 0,
            'social': 10,
            'culture': 20,
            'tech': 30,
            'sports': 40,
            'finance': 50,
            'entertainment': 60,
            'politics': 70,
            'health': 80,
        }
        return order_mapping.get(slug, 100)
    
    def _check_orphaned_templates(self):
        """检查数据库中是否有孤立的模板记录（文件不存在）"""
        self.stdout.write('\n🔍 检查孤立的模板记录...')
        
        orphaned = []
        for template in ChannelTemplate.objects.all():
            if not template.file_exists:
                orphaned.append(template)
        
        if orphaned:
            self.stdout.write(
                self.style.WARNING(f'⚠️  发现 {len(orphaned)} 个孤立记录:')
            )
            for template in orphaned:
                self.stdout.write(f'  ❌ {template.name} ({template.file_name})')
            self.stdout.write('建议手动删除这些记录或创建对应的模板文件')
        else:
            self.stdout.write(
                self.style.SUCCESS('✅ 所有模板记录都有对应的文件')
            )
