from django.db.models.signals import post_save
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
def generate_news_renditions(sender, instance, created, **kwargs):
    """
    当新图片上传时，自动生成新闻网站需要的所有缩略图规格
    """
    if not created:
        return
        
    try:
        print(f"正在为图片 '{instance.title}' 生成缩略图...")
        generated_count = 0
        
        for name, spec in NEWS_IMAGE_RENDITIONS.items():
            try:
                rendition = instance.get_rendition(spec)
                generated_count += 1
                print(f"  ✓ 已生成 {name}: {rendition.width}x{rendition.height}")
            except Exception as e:
                print(f"  ✗ 生成 {name} 失败: {e}")
        
        print(f"图片 '{instance.title}' 共生成 {generated_count}/{len(NEWS_IMAGE_RENDITIONS)} 个规格")
        
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


