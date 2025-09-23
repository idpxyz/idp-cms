from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from wagtail.images import get_image_model

from .media_paths import build_media_path


ImageModel = get_image_model()
RenditionModel = ImageModel.get_rendition_model()


# 新闻网站图片规格配置
NEWS_IMAGE_RENDITIONS = {
    # 首页和轮播图
    'hero_desktop': 'fill-1200x600|jpegquality-85',      # 桌面端轮播图
    'hero_mobile': 'fill-800x400|jpegquality-85',        # 移动端轮播图
    
    # 文章列表缩略图
    'card_large': 'fill-400x300|jpegquality-80',         # 大卡片缩略图
    'card_medium': 'fill-300x200|jpegquality-80',        # 中等卡片缩略图
    'card_small': 'fill-200x150|jpegquality-80',         # 小卡片缩略图
    
    # 文章详情页
    'article_full': 'max-800x600|jpegquality-85',        # 文章内容图（保持比例）
    'article_inline': 'max-600x450|jpegquality-80',      # 文章内嵌图
    
    # 侧边栏和推荐
    'sidebar_thumb': 'fill-120x90|jpegquality-75',       # 侧边栏缩略图
    'related_thumb': 'fill-150x100|jpegquality-75',      # 相关文章缩略图
    
    # 移动端适配
    'mobile_card': 'fill-320x240|jpegquality-75',        # 移动端卡片
    'mobile_list': 'fill-100x75|jpegquality-70',         # 移动端列表缩略图
    
    # 社交媒体和SEO
    'og_image': 'fill-1200x630|jpegquality-85',          # Open Graph 分享图
    'twitter_card': 'fill-800x418|jpegquality-85',       # Twitter 卡片
    
    # 管理界面
    'admin_thumb': 'max-165x165|jpegquality-75',         # 管理界面缩略图
    'admin_preview': 'max-300x300|jpegquality-80',       # 管理界面预览
    
    # 响应式图片（不同分辨率）
    'responsive_xs': 'max-320x240|jpegquality-70',       # 超小屏
    'responsive_sm': 'max-480x360|jpegquality-75',       # 小屏
    'responsive_md': 'max-768x576|jpegquality-80',       # 中屏
    'responsive_lg': 'max-1024x768|jpegquality-85',      # 大屏
    'responsive_xl': 'max-1200x900|jpegquality-85',      # 超大屏
}


@receiver(post_save, sender=ImageModel)
def generate_essential_renditions_sync(sender, instance, created, **kwargs):
    """
    立即生成必需的缩略图规格，其余异步处理
    """
    if not created:
        return
        
    try:
        print(f"正在为图片 '{instance.title}' 生成必需缩略图...")
        
        # 立即生成最重要的2-3个规格（上传后立即可能需要的）
        essential_specs = [
            'admin_thumb',      # 管理界面缩略图（立即显示）
            'card_medium',      # 中等卡片（最常用）
            'responsive_md',    # 中等响应式（通用显示）
        ]
        
        generated_count = 0
        for spec_name in essential_specs:
            if spec_name in NEWS_IMAGE_RENDITIONS:
                try:
                    spec = NEWS_IMAGE_RENDITIONS[spec_name]
                    rendition = instance.get_rendition(spec)
                    generated_count += 1
                    print(f"  ✓ 已生成 {spec_name}: {rendition.width}x{rendition.height}")
                except Exception as e:
                    print(f"  ✗ 生成 {spec_name} 失败: {e}")
        
        print(f"图片 '{instance.title}' 立即生成 {generated_count} 个必需规格")
        
        # 异步生成其余规格
        from .tasks.media_tasks import generate_remaining_renditions
        generate_remaining_renditions.delay(instance.id, essential_specs)
        print(f"已触发异步任务生成其余 {len(NEWS_IMAGE_RENDITIONS) - len(essential_specs)} 个规格")
        
    except Exception as e:
        print(f"生成缩略图时出错: {e}")


@receiver(post_save, sender=RenditionModel)
def relocate_rendition_after_save(sender, instance, created, **kwargs):
    """将生成在 c0-uncategorized/default 下的缩略图搬运到稳定路径。

    基于 instance.image.collection 生成新路径，然后复制对象并更新DB，最后尝试删除旧对象。
    """
    try:
        name = getattr(instance.file, 'name', '') or ''
        if not name:
            return
        if '/c0-uncategorized/' not in name and '/default/' not in name:
            return

        image = getattr(instance, 'image', None)
        if image is None or getattr(image, 'collection', None) is None:
            return

        # 构造新路径
        class Tmp:
            pass
        tmp = Tmp()
        tmp.collection = image.collection
        tmp.file_category = 'renditions'

        import os
        _, ext = os.path.splitext(name)
        if not ext:
            ext = '.bin'

        new_name = build_media_path(tmp, f'migrate{ext}')
        storage = instance.file.storage

        # 复制对象
        with instance.file.open('rb') as fsrc:
            storage.save(new_name, fsrc)

        # 更新DB（避免再次触发搬运）
        sender.objects.filter(pk=instance.pk).update(file=new_name)

        # 尝试删除旧对象
        try:
            storage.delete(name)
        except Exception:
            pass
    except Exception:
        return


@receiver(pre_save, sender=ImageModel)
def track_collection_changes(sender, instance, **kwargs):
    """
    在保存前记录 collection 的原始值，用于检测变更
    """
    if instance.pk:  # 只对已存在的实例进行检测
        try:
            original = sender.objects.get(pk=instance.pk)
            instance._original_collection_id = getattr(original.collection, 'id', None) if original.collection else None
        except sender.DoesNotExist:
            instance._original_collection_id = None
    else:
        instance._original_collection_id = None


@receiver(post_save, sender=ImageModel)
def handle_collection_change(sender, instance, created, **kwargs):
    """
    处理 collection 变更时的文件迁移
    """
    if created:
        return  # 新创建的图片不需要迁移
        
    # 检查是否有 collection 变更
    original_collection_id = getattr(instance, '_original_collection_id', None)
    current_collection_id = getattr(instance.collection, 'id', None) if instance.collection else None
    
    if original_collection_id != current_collection_id:
        print(f"检测到图片 '{instance.title}' collection 变更: {original_collection_id} -> {current_collection_id}")
        
        # 异步执行文件迁移
        from .tasks.media_tasks import migrate_image_files_on_collection_change
        migrate_image_files_on_collection_change.delay(
            instance.id,
            original_collection_id,
            current_collection_id
        )


