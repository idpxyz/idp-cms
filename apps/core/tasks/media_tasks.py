"""
媒体文件处理相关的异步任务
"""

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import logging
import os

logger = logging.getLogger(__name__)


def generate_rendition_webp_copy(rendition_instance):
    """
    🚀 为 Rendition 生成同名的 WebP 副本
    
    当 Wagtail 编辑器插入图片时，使用的是 rendition 路径。
    为了让前端能够访问到 WebP 版本，需要为 rendition 也生成 WebP。
    
    示例:
    - Rendition: /media/.../renditions/9885de76ffd4d889.jpg
    - WebP: /media/.../renditions/9885de76ffd4d889.webp
    
    Args:
        rendition_instance: Rendition 模型实例
    
    Returns:
        str: 生成的 WebP 文件路径，失败返回 None
    """
    try:
        if not rendition_instance or not rendition_instance.file:
            logger.warning("Rendition 实例或文件不存在，跳过WebP生成")
            return None
        
        rendition_path = rendition_instance.file.name
        
        # 检查是否已经是 WebP 格式
        if rendition_path.lower().endswith('.webp'):
            logger.debug(f"Rendition 已是WebP格式，跳过: {rendition_path}")
            return None
        
        # 生成 WebP 路径（同目录，同文件名，只改扩展名）
        webp_path = os.path.splitext(rendition_path)[0] + '.webp'
        
        # 检查 WebP 是否已存在
        if default_storage.exists(webp_path):
            logger.debug(f"Rendition WebP 文件已存在，跳过: {webp_path}")
            return webp_path
        
        # 使用 PIL 转换为 WebP
        try:
            from PIL import Image
            
            # 读取原始 rendition
            with rendition_instance.file.open('rb') as f:
                img = Image.open(f)
                
                # 转换为 RGB（WebP 不支持 RGBA 的某些模式）
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'RGBA':
                        background.paste(img, mask=img.split()[3])
                    else:
                        background.paste(img, mask=img.split()[1])
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 保存为 WebP
                import io
                webp_io = io.BytesIO()
                img.save(webp_io, format='WEBP', quality=85)
                webp_io.seek(0)
                
                # 保存到存储
                saved_path = default_storage.save(webp_path, ContentFile(webp_io.read()))
                logger.info(f"✅ 成功为 rendition 生成 WebP: {saved_path}")
                return saved_path
                
        except Exception as e:
            logger.error(f"转换 rendition 到 WebP 失败: {e}")
            return None
            
    except Exception as e:
        logger.error(f"为 rendition 生成 WebP 失败: {e}")
        return None


def generate_original_size_webp_sync(image_instance):
    """
    🚀 为图片生成同名的 WebP 副本（保持原尺寸）
    
    用于文章正文图片优化：
    - 原图: /media/images/photo.jpg
    - WebP: /media/images/photo.webp
    
    这样前端的 <picture> 标签就能找到 WebP 文件
    
    Args:
        image_instance: Image 模型实例
    
    Returns:
        str: 生成的 WebP 文件路径，失败返回 None
    """
    try:
        if not image_instance or not image_instance.file:
            logger.warning("图片实例或文件不存在，跳过WebP生成")
            return None
        
        original_path = image_instance.file.name  # e.g., "portal/c2-news/2025/01/images/photo.jpg"
        
        # 检查是否已经是 WebP 格式
        if original_path.lower().endswith('.webp'):
            logger.debug(f"图片已是WebP格式，跳过: {original_path}")
            return None
        
        # 生成 WebP rendition（保持原尺寸）
        try:
            # 使用 Wagtail 的图片处理引擎生成 WebP
            rendition = image_instance.get_rendition('format-webp|webpquality-85')
        except Exception as e:
            logger.error(f"生成 WebP rendition 失败: {e}")
            return None
        
        if not rendition or not rendition.file:
            logger.warning("WebP rendition 生成失败")
            return None
        
        # 构造同名 WebP 路径
        # 将扩展名替换为 .webp
        webp_path = os.path.splitext(original_path)[0] + '.webp'
        
        # 检查 WebP 文件是否已存在
        if default_storage.exists(webp_path):
            logger.debug(f"WebP 文件已存在，跳过: {webp_path}")
            return webp_path
        
        # 复制 rendition 文件到同名 WebP 路径
        try:
            with rendition.file.open('rb') as src:
                content = src.read()
                saved_path = default_storage.save(webp_path, ContentFile(content))
                logger.info(f"✅ 成功生成同名 WebP: {saved_path}")
                return saved_path
        except Exception as e:
            logger.error(f"保存 WebP 文件失败: {e}")
            return None
            
    except Exception as e:
        logger.error(f"生成原尺寸 WebP 失败: {e}")
        return None


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def generate_remaining_renditions(self, image_id, exclude_specs=None):
    """
    异步生成图片的剩余缩略图规格
    
    Args:
        image_id: 图片ID
        exclude_specs: 已生成的规格列表，跳过这些
    
    Returns:
        dict: 生成结果统计
    """
    try:
        from wagtail.images import get_image_model
        from apps.core.signals_media import NEWS_IMAGE_RENDITIONS
        
        ImageModel = get_image_model()
        exclude_specs = exclude_specs or []
        
        # 获取图片实例
        try:
            image = ImageModel.objects.get(id=image_id)
        except ImageModel.DoesNotExist:
            logger.error(f"图片 ID {image_id} 不存在")
            return {'success': False, 'error': 'Image not found'}
        
        print(f"异步生成图片 '{image.title}' 的剩余缩略图...")
        
        # 按优先级分组生成
        priority_groups = {
            'high': [
                'card_large', 'card_small', 
                'article_full', 'responsive_sm', 'responsive_lg'
            ],
            'medium': [
                'hero_desktop', 'hero_mobile',
                'sidebar_thumb', 'related_thumb', 'mobile_card'
            ],
            'low': [
                'article_inline', 'mobile_list', 'og_image', 
                'twitter_card', 'admin_preview', 'responsive_xs', 'responsive_xl'
            ]
        }
        
        generated_count = 0
        failed_count = 0
        total_remaining = len(NEWS_IMAGE_RENDITIONS) - len(exclude_specs)
        
        for priority in ['high', 'medium', 'low']:
            specs = priority_groups[priority]
            print(f"  生成 {priority} 优先级缩略图...")
            
            for spec_name in specs:
                if spec_name in exclude_specs or spec_name not in NEWS_IMAGE_RENDITIONS:
                    continue
                    
                try:
                    spec = NEWS_IMAGE_RENDITIONS[spec_name]
                    rendition = image.get_rendition(spec)
                    generated_count += 1
                    print(f"    ✓ 已生成 {spec_name}: {rendition.width}x{rendition.height}")
                except Exception as e:
                    failed_count += 1
                    logger.warning(f"    ✗ 生成 {spec_name} 失败: {e}")
        
        result = {
            'success': True,
            'image_id': image_id,
            'image_title': image.title,
            'generated_count': generated_count,
            'failed_count': failed_count,
            'total_remaining': total_remaining,
            'timestamp': timezone.now().isoformat()
        }
        
        print(f"图片 '{image.title}' 异步生成完成: {generated_count}/{total_remaining} 成功")
        logger.info(f"异步缩略图生成完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"异步生成缩略图失败 (image_id={image_id}): {e}")
        raise  # Celery 自动重试


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def batch_generate_missing_renditions(self, image_ids=None, spec_names=None, limit=50):
    """
    批量生成缺失的缩略图（用于修复或补充）
    
    Args:
        image_ids: 指定图片ID列表，None表示检查所有
        spec_names: 指定规格列表，None表示检查所有规格
        limit: 批量处理限制
    
    Returns:
        dict: 批量处理结果
    """
    try:
        from wagtail.images import get_image_model
        from apps.core.signals_media import NEWS_IMAGE_RENDITIONS
        
        ImageModel = get_image_model()
        RenditionModel = ImageModel.get_rendition_model()
        
        spec_names = spec_names or list(NEWS_IMAGE_RENDITIONS.keys())
        
        # 构建图片查询
        if image_ids:
            images = ImageModel.objects.filter(id__in=image_ids[:limit])
        else:
            # 检查最近上传的图片
            images = ImageModel.objects.order_by('-created_at')[:limit]
        
        total_generated = 0
        total_failed = 0
        processed_images = 0
        
        for image in images:
            processed_images += 1
            image_generated = 0
            
            for spec_name in spec_names:
                if spec_name not in NEWS_IMAGE_RENDITIONS:
                    continue
                
                spec = NEWS_IMAGE_RENDITIONS[spec_name]
                
                # 检查是否已存在该规格的缩略图
                try:
                    existing_rendition = RenditionModel.objects.filter(
                        image=image,
                        filter_spec=spec
                    ).first()
                    
                    if existing_rendition and existing_rendition.file:
                        # 已存在，跳过
                        continue
                    
                    # 生成缺失的缩略图
                    rendition = image.get_rendition(spec)
                    total_generated += 1
                    image_generated += 1
                    
                except Exception as e:
                    total_failed += 1
                    logger.warning(f"生成 {image.title} 的 {spec_name} 失败: {e}")
            
            if image_generated > 0:
                print(f"为图片 '{image.title}' 生成了 {image_generated} 个缺失的缩略图")
        
        result = {
            'success': True,
            'processed_images': processed_images,
            'total_generated': total_generated,
            'total_failed': total_failed,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"批量缩略图生成完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"批量生成缩略图失败: {e}")
        raise


@shared_task
def cleanup_orphaned_renditions(days_old=30):
    """
    清理孤立的缩略图文件（对应的原图已删除）
    
    Args:
        days_old: 只清理指定天数前的孤立文件
    """
    try:
        from wagtail.images import get_image_model
        from django.utils import timezone
        from datetime import timedelta
        
        ImageModel = get_image_model()
        RenditionModel = ImageModel.get_rendition_model()
        
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        # 查找孤立的缩略图（原图不存在）
        orphaned_renditions = RenditionModel.objects.filter(
            created_at__lt=cutoff_date,
            image__isnull=True
        )
        
        deleted_count = 0
        for rendition in orphaned_renditions[:1000]:  # 限制批量大小
            try:
                if rendition.file:
                    rendition.file.delete()
                rendition.delete()
                deleted_count += 1
            except Exception as e:
                logger.warning(f"删除孤立缩略图失败: {e}")
        
        result = {
            'success': True,
            'deleted_count': deleted_count,
            'days_old': days_old,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"清理孤立缩略图完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"清理孤立缩略图失败: {e}")
        return {'success': False, 'error': str(e)}


@shared_task
def generate_specific_renditions_for_images(image_ids, spec_names):
    """
    为指定图片生成特定规格的缩略图
    
    Args:
        image_ids: 图片ID列表
        spec_names: 规格名称列表
    """
    try:
        from wagtail.images import get_image_model
        from apps.core.signals_media import NEWS_IMAGE_RENDITIONS
        
        ImageModel = get_image_model()
        
        generated_count = 0
        failed_count = 0
        
        for image_id in image_ids:
            try:
                image = ImageModel.objects.get(id=image_id)
                
                for spec_name in spec_names:
                    if spec_name not in NEWS_IMAGE_RENDITIONS:
                        continue
                    
                    try:
                        spec = NEWS_IMAGE_RENDITIONS[spec_name]
                        rendition = image.get_rendition(spec)
                        generated_count += 1
                        print(f"✓ 为图片 {image.title} 生成 {spec_name}")
                    except Exception as e:
                        failed_count += 1
                        logger.warning(f"为图片 {image.title} 生成 {spec_name} 失败: {e}")
                        
            except ImageModel.DoesNotExist:
                failed_count += 1
                logger.warning(f"图片 ID {image_id} 不存在")
        
        result = {
            'success': True,
            'generated_count': generated_count,
            'failed_count': failed_count,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"指定缩略图生成完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"指定缩略图生成失败: {e}")
        return {'success': False, 'error': str(e)}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def migrate_image_files_on_collection_change(self, image_id, old_collection_id, new_collection_id):
    """
    当图片的 collection 变更时，迁移文件到新的路径
    
    Args:
        image_id: 图片ID
        old_collection_id: 原collection ID
        new_collection_id: 新collection ID
    
    Returns:
        dict: 迁移结果
    """
    try:
        from wagtail.images import get_image_model
        from wagtail.models import Collection
        from apps.core.media_paths import build_media_path, build_collection_segment
        import os
        
        ImageModel = get_image_model()
        RenditionModel = ImageModel.get_rendition_model()
        
        # 获取图片实例
        try:
            image = ImageModel.objects.get(id=image_id)
        except ImageModel.DoesNotExist:
            logger.error(f"图片 ID {image_id} 不存在")
            return {'success': False, 'error': 'Image not found'}
        
        print(f"开始迁移图片 '{image.title}' 的文件...")
        
        # 获取 collection 信息
        old_collection = Collection.objects.get(id=old_collection_id) if old_collection_id else None
        new_collection = image.collection  # 当前的 collection
        
        old_collection_segment = build_collection_segment(old_collection)
        new_collection_segment = build_collection_segment(new_collection)
        
        print(f"Collection 变更: {old_collection_segment} -> {new_collection_segment}")
        
        storage = image.file.storage
        migrated_files = []
        failed_files = []
        
        # 1. 迁移原始图片文件
        if image.file and image.file.name:
            old_path = image.file.name
            new_path = _calculate_new_path(old_path, old_collection_segment, new_collection_segment)
            
            if old_path != new_path:
                success = _migrate_single_file(storage, old_path, new_path, "原始图片")
                if success:
                    # 更新数据库中的文件路径
                    ImageModel.objects.filter(id=image_id).update(file=new_path)
                    migrated_files.append(f"原始图片: {old_path} -> {new_path}")
                    print(f"  ✓ 原始图片已迁移: {new_path}")
                else:
                    failed_files.append(f"原始图片: {old_path}")
        
        # 2. 迁移所有相关的缩略图
        renditions = RenditionModel.objects.filter(image=image)
        rendition_migrated = 0
        
        for rendition in renditions:
            if rendition.file and rendition.file.name:
                old_rendition_path = rendition.file.name
                new_rendition_path = _calculate_new_path(
                    old_rendition_path, 
                    old_collection_segment, 
                    new_collection_segment
                )
                
                if old_rendition_path != new_rendition_path:
                    success = _migrate_single_file(
                        storage, 
                        old_rendition_path, 
                        new_rendition_path, 
                        f"缩略图 {rendition.filter_spec}"
                    )
                    if success:
                        # 更新缩略图的文件路径
                        RenditionModel.objects.filter(id=rendition.id).update(file=new_rendition_path)
                        rendition_migrated += 1
                        migrated_files.append(f"缩略图: {old_rendition_path} -> {new_rendition_path}")
                    else:
                        failed_files.append(f"缩略图: {old_rendition_path}")
        
        result = {
            'success': True,
            'image_id': image_id,
            'image_title': image.title,
            'old_collection': old_collection_segment,
            'new_collection': new_collection_segment,
            'migrated_files': len(migrated_files),
            'failed_files': len(failed_files),
            'renditions_migrated': rendition_migrated,
            'details': {
                'migrated': migrated_files,
                'failed': failed_files
            },
            'timestamp': timezone.now().isoformat()
        }
        
        if failed_files:
            logger.warning(f"图片迁移部分失败: {result}")
        else:
            logger.info(f"图片迁移完全成功: {result}")
        
        print(f"图片 '{image.title}' 迁移完成: {len(migrated_files)} 成功, {len(failed_files)} 失败")
        return result
        
    except Exception as e:
        logger.error(f"图片文件迁移失败 (image_id={image_id}): {e}")
        raise  # Celery 自动重试


def _calculate_new_path(old_path, old_collection_segment, new_collection_segment):
    """
    根据旧路径和 collection 变更计算新路径
    
    Args:
        old_path: 旧文件路径
        old_collection_segment: 旧collection段 (如 c1-news)
        new_collection_segment: 新collection段 (如 c2-politics)
    
    Returns:
        str: 新文件路径
    """
    # 替换路径中的 collection 段
    # 路径格式: aivoya/portal/c1-news/2025/01/originals/xxx.jpg
    # 或者:     portal/c1-news/2025/01/originals/xxx.jpg
    
    path_parts = old_path.split('/')
    
    # 查找 collection 段的位置
    for i, part in enumerate(path_parts):
        if part == old_collection_segment:
            path_parts[i] = new_collection_segment
            break
    
    return '/'.join(path_parts)


def _migrate_single_file(storage, old_path, new_path, file_description):
    """
    迁移单个文件
    
    Args:
        storage: 存储后端
        old_path: 旧路径
        new_path: 新路径
        file_description: 文件描述（用于日志）
    
    Returns:
        bool: 是否成功
    """
    try:
        # 检查旧文件是否存在
        if not storage.exists(old_path):
            print(f"  ⚠ {file_description} 旧文件不存在: {old_path}")
            return False
        
        # 确保新路径的目录存在
        import os
        new_dir = os.path.dirname(new_path)
        
        # 复制文件到新位置
        with storage.open(old_path, 'rb') as old_file:
            storage.save(new_path, old_file)
        
        # 验证新文件是否创建成功
        if storage.exists(new_path):
            # 删除旧文件
            try:
                storage.delete(old_path)
                print(f"  ✓ {file_description} 迁移成功")
                return True
            except Exception as e:
                print(f"  ⚠ {file_description} 删除旧文件失败: {e}")
                # 即使删除失败，迁移也算成功
                return True
        else:
            print(f"  ✗ {file_description} 新文件创建失败")
            return False
            
    except Exception as e:
        print(f"  ✗ {file_description} 迁移失败: {e}")
        logger.warning(f"文件迁移失败 {old_path} -> {new_path}: {e}")
        return False


@shared_task
def batch_migrate_collection_files(collection_mapping, limit=50):
    """
    批量迁移指定 collection 变更的文件
    
    Args:
        collection_mapping: 字典 {old_collection_id: new_collection_id}
        limit: 每次处理的图片数量限制
    
    Returns:
        dict: 批量迁移结果
    """
    try:
        from wagtail.images import get_image_model
        
        ImageModel = get_image_model()
        
        total_processed = 0
        total_successful = 0
        total_failed = 0
        
        for old_collection_id, new_collection_id in collection_mapping.items():
            # 查找需要迁移的图片
            images = ImageModel.objects.filter(collection_id=old_collection_id)[:limit]
            
            for image in images:
                try:
                    # 更新图片的 collection
                    image.collection_id = new_collection_id
                    image.save()  # 这会触发迁移信号
                    
                    total_successful += 1
                    total_processed += 1
                    
                except Exception as e:
                    logger.error(f"批量迁移图片 {image.id} 失败: {e}")
                    total_failed += 1
                    total_processed += 1
        
        result = {
            'success': True,
            'total_processed': total_processed,
            'total_successful': total_successful,
            'total_failed': total_failed,
            'collection_mapping': collection_mapping,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"批量collection迁移完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"批量collection迁移失败: {e}")
        return {'success': False, 'error': str(e)}
