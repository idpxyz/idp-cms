"""
图片工具类 - 提供前端访问不同规格图片的便捷方法
"""
from apps.core.signals_media import NEWS_IMAGE_RENDITIONS


class ImageURLGenerator:
    """图片URL生成器"""
    
    @staticmethod
    def get_rendition_urls(image, specs=None):
        """
        获取指定图片的所有规格URL
        
        Args:
            image: CustomImage实例
            specs: 指定的规格列表，如None则返回所有规格
            
        Returns:
            dict: 规格名称到URL的映射
        """
        if not image or not image.file:
            return {}
        
        renditions = {}
        specs_to_use = specs or NEWS_IMAGE_RENDITIONS.keys()
        
        for spec_name in specs_to_use:
            if spec_name not in NEWS_IMAGE_RENDITIONS:
                continue
                
            spec = NEWS_IMAGE_RENDITIONS[spec_name]
            try:
                rendition = image.get_rendition(spec)
                renditions[spec_name] = {
                    'url': rendition.url,
                    'width': rendition.width,
                    'height': rendition.height,
                    'file_size': getattr(rendition.file, 'size', None) if rendition.file else None
                }
            except Exception as e:
                print(f"生成 {spec_name} 规格失败: {e}")
                renditions[spec_name] = None
        
        return renditions
    
    @staticmethod
    def get_responsive_urls(image):
        """获取响应式图片的所有规格"""
        responsive_specs = [
            'responsive_xs', 'responsive_sm', 'responsive_md', 
            'responsive_lg', 'responsive_xl'
        ]
        return ImageURLGenerator.get_rendition_urls(image, responsive_specs)
    
    @staticmethod
    def get_card_urls(image):
        """获取卡片相关的规格"""
        card_specs = ['card_large', 'card_medium', 'card_small', 'mobile_card']
        return ImageURLGenerator.get_rendition_urls(image, card_specs)
    
    @staticmethod
    def get_hero_urls(image):
        """获取轮播图规格"""
        hero_specs = ['hero_desktop', 'hero_mobile']
        return ImageURLGenerator.get_rendition_urls(image, hero_specs)
    
    @staticmethod
    def get_social_urls(image):
        """获取社交媒体分享图规格"""
        social_specs = ['og_image', 'twitter_card']
        return ImageURLGenerator.get_rendition_urls(image, social_specs)
    
    @staticmethod
    def get_article_urls(image):
        """获取文章相关规格"""
        article_specs = ['article_full', 'article_inline']
        return ImageURLGenerator.get_rendition_urls(image, article_specs)


class ImageRenditionSerializer:
    """用于API序列化的图片规格序列化器"""
    
    @staticmethod
    def serialize_image_with_renditions(image, include_specs=None):
        """
        序列化图片及其所有规格信息
        
        Returns:
            dict: 完整的图片信息，包含所有规格的URL
        """
        if not image:
            return None
        
        # 基本图片信息
        data = {
            'id': image.id,
            'title': image.title,
            'description': getattr(image, 'description', ''),
            'width': image.width,
            'height': image.height,
            'file_size': getattr(image.file, 'size', None) if image.file else None,
            'original_url': image.file.url if image.file else None,
        }
        
        # 添加所有规格的URL
        renditions = ImageURLGenerator.get_rendition_urls(image, include_specs)
        data['renditions'] = renditions
        
        # 按用途分组的规格（便于前端使用）
        data['by_usage'] = {
            'hero': ImageURLGenerator.get_hero_urls(image),
            'cards': ImageURLGenerator.get_card_urls(image),
            'article': ImageURLGenerator.get_article_urls(image),
            'responsive': ImageURLGenerator.get_responsive_urls(image),
            'social': ImageURLGenerator.get_social_urls(image),
        }
        
        return data


def get_image_srcset(image, specs_list):
    """
    生成HTML picture/img标签的srcset属性
    
    Args:
        image: CustomImage实例
        specs_list: 规格列表，如 ['responsive_xs', 'responsive_sm', 'responsive_md']
    
    Returns:
        str: srcset字符串
    """
    if not image or not specs_list:
        return ""
    
    srcset_parts = []
    for spec_name in specs_list:
        if spec_name not in NEWS_IMAGE_RENDITIONS:
            continue
        
        spec = NEWS_IMAGE_RENDITIONS[spec_name]
        try:
            rendition = image.get_rendition(spec)
            srcset_parts.append(f"{rendition.url} {rendition.width}w")
        except:
            continue
    
    return ", ".join(srcset_parts)


def get_picture_element_data(image):
    """
    生成HTML picture元素所需的数据
    
    Returns:
        dict: 包含不同断点的source信息
    """
    if not image:
        return {}
    
    return {
        'sources': [
            {
                'media': '(max-width: 480px)',
                'srcset': get_image_srcset(image, ['responsive_xs', 'mobile_card']),
                'sizes': '100vw'
            },
            {
                'media': '(max-width: 768px)', 
                'srcset': get_image_srcset(image, ['responsive_sm', 'card_medium']),
                'sizes': '100vw'
            },
            {
                'media': '(max-width: 1024px)',
                'srcset': get_image_srcset(image, ['responsive_md', 'card_large']),
                'sizes': '(max-width: 1024px) 100vw, 1024px'
            },
            {
                'media': '(min-width: 1025px)',
                'srcset': get_image_srcset(image, ['responsive_lg', 'responsive_xl']),
                'sizes': '(max-width: 1200px) 100vw, 1200px'
            }
        ],
        'fallback': {
            'src': image.get_rendition('responsive_md').url if image else '',
            'alt': getattr(image, 'description', '') or image.title if image else ''
        }
    }
