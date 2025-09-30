"""
重新生成所有图片的WebP格式renditions

使用方法:
    python manage.py regenerate_webp_renditions
    
    # 只重新生成Hero图片
    python manage.py regenerate_webp_renditions --hero-only
    
    # 强制重新生成（删除旧的renditions）
    python manage.py regenerate_webp_renditions --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.images import get_image_model
from apps.core.signals_media import NEWS_IMAGE_RENDITIONS

ImageModel = get_image_model()
RenditionModel = ImageModel.get_rendition_model()


class Command(BaseCommand):
    help = '重新生成所有图片的WebP格式renditions以优化性能'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hero-only',
            action='store_true',
            help='只重新生成Hero轮播图的renditions',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='强制删除旧renditions并重新生成',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='限制处理的图片数量（用于测试）',
        )

    def handle(self, *args, **options):
        hero_only = options['hero_only']
        force = options['force']
        limit = options['limit']
        
        self.stdout.write(self.style.SUCCESS('开始重新生成WebP格式renditions...'))
        
        # 获取要处理的图片
        images = ImageModel.objects.all().order_by('-created_at')
        if limit:
            images = images[:limit]
            
        total_images = images.count()
        self.stdout.write(f'找到 {total_images} 张图片需要处理')
        
        # 确定要生成的规格
        if hero_only:
            specs_to_generate = {
                'hero_desktop': NEWS_IMAGE_RENDITIONS['hero_desktop'],
                'hero_mobile': NEWS_IMAGE_RENDITIONS['hero_mobile'],
            }
            self.stdout.write(self.style.WARNING('只处理Hero轮播图规格'))
        else:
            # 只处理WebP格式的规格
            specs_to_generate = {
                k: v for k, v in NEWS_IMAGE_RENDITIONS.items() 
                if 'webp' in v.lower()
            }
        
        self.stdout.write(f'将生成 {len(specs_to_generate)} 种规格的WebP renditions')
        
        total_generated = 0
        total_errors = 0
        
        for idx, image in enumerate(images, 1):
            self.stdout.write(f'\n[{idx}/{total_images}] 处理图片: {image.title} (ID: {image.id})')
            
            generated_count = 0
            error_count = 0
            
            for spec_name, spec in specs_to_generate.items():
                try:
                    # 如果force=True，先删除旧的rendition
                    if force:
                        existing = RenditionModel.objects.filter(
                            image=image,
                            filter_spec=spec
                        )
                        if existing.exists():
                            deleted_count = existing.count()
                            existing.delete()
                            self.stdout.write(
                                self.style.WARNING(f'  删除了 {deleted_count} 个旧的 {spec_name} renditions')
                            )
                    
                    # 生成新的WebP rendition
                    rendition = image.get_rendition(spec)
                    file_size = rendition.file.size if rendition.file else 0
                    file_size_kb = file_size / 1024
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ {spec_name}: {rendition.width}x{rendition.height} '
                            f'({file_size_kb:.1f} KB)'
                        )
                    )
                    generated_count += 1
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {spec_name} 生成失败: {str(e)}')
                    )
                    error_count += 1
            
            total_generated += generated_count
            total_errors += error_count
            
            self.stdout.write(
                f'  图片 {image.title}: 生成 {generated_count} 个, 失败 {error_count} 个'
            )
        
        # 总结
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('WebP格式renditions生成完成！'))
        self.stdout.write(f'总共处理: {total_images} 张图片')
        self.stdout.write(self.style.SUCCESS(f'成功生成: {total_generated} 个renditions'))
        if total_errors > 0:
            self.stdout.write(self.style.ERROR(f'失败: {total_errors} 个renditions'))
        
        self.stdout.write('\n提示:')
        self.stdout.write('- 新上传的图片会自动生成WebP格式')
        self.stdout.write('- 建议清理旧的JPEG/PNG renditions以节省存储空间')
        self.stdout.write('- 可以使用 python manage.py cleanup_old_renditions 清理')
