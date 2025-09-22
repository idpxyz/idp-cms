from django.core.management.base import BaseCommand
from apps.core.models import ChannelTemplate
import os
from django.conf import settings


class Command(BaseCommand):
    help = '同步模板文件到数据库'

    def handle(self, *args, **options):
        template_dir = os.path.join(
            settings.BASE_DIR, 
            'sites', 'app', 'portal', 'templates', 'channels'
        )
        
        if not os.path.exists(template_dir):
            self.stdout.write(self.style.ERROR('模板目录不存在'))
            return
        
        self.stdout.write('扫描模板文件...')
        
        # 预定义的模板信息
        template_info = {
            'DefaultTemplate.tsx': {'slug': 'default', 'name': '默认模板'},
            'SocialTemplate.tsx': {'slug': 'social', 'name': '社会频道模板'},
            'CultureTemplate.tsx': {'slug': 'culture', 'name': '文化频道模板'},
            'TechTemplate.tsx': {'slug': 'tech', 'name': '科技频道模板'},
        }
        
        created_count = 0
        
        for file_name in os.listdir(template_dir):
            if file_name.endswith('.tsx') and file_name in template_info:
                info = template_info[file_name]
                
                template, created = ChannelTemplate.objects.get_or_create(
                    slug=info['slug'],
                    defaults={
                        'name': info['name'],
                        'file_name': file_name,
                        'is_default': info['slug'] == 'default',
                    }
                )
                
                if created:
                    self.stdout.write(f'创建: {template.name}')
                    created_count += 1
                else:
                    self.stdout.write(f'已存在: {template.name}')
        
        self.stdout.write(f'完成！创建了 {created_count} 个模板记录')
