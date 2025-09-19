"""
自定义图片模板标签 - 简化前端图片使用
"""
from django import template
from django.utils.safestring import mark_safe
from apps.core.image_utils import ImageURLGenerator, get_image_srcset, get_picture_element_data
from apps.core.signals_media import NEWS_IMAGE_RENDITIONS

register = template.Library()


@register.simple_tag
def image_url(image, spec_name):
    """
    获取指定规格的图片URL
    用法: {% image_url article.featured_image 'card_large' %}
    """
    if not image or spec_name not in NEWS_IMAGE_RENDITIONS:
        return ''
    
    try:
        spec = NEWS_IMAGE_RENDITIONS[spec_name]
        rendition = image.get_rendition(spec)
        return rendition.url
    except:
        return ''


@register.simple_tag
def image_data(image, spec_name):
    """
    获取指定规格的完整图片数据
    用法: {% image_data article.featured_image 'card_large' as img_data %}
    """
    if not image or spec_name not in NEWS_IMAGE_RENDITIONS:
        return None
    
    try:
        spec = NEWS_IMAGE_RENDITIONS[spec_name]
        rendition = image.get_rendition(spec)
        return {
            'url': rendition.url,
            'width': rendition.width,
            'height': rendition.height,
            'alt': getattr(image, 'description', '') or image.title
        }
    except:
        return None


@register.simple_tag
def responsive_image_srcset(image, breakpoint='all'):
    """
    生成响应式图片的srcset
    用法: {% responsive_image_srcset article.featured_image 'mobile' %}
    """
    if not image:
        return ''
    
    if breakpoint == 'mobile':
        specs = ['responsive_xs', 'responsive_sm']
    elif breakpoint == 'tablet':
        specs = ['responsive_sm', 'responsive_md']
    elif breakpoint == 'desktop':
        specs = ['responsive_md', 'responsive_lg', 'responsive_xl']
    else:  # all
        specs = ['responsive_xs', 'responsive_sm', 'responsive_md', 'responsive_lg', 'responsive_xl']
    
    return get_image_srcset(image, specs)


@register.inclusion_tag('core/image_tags/picture_element.html')
def responsive_picture(image, css_class='', alt_text=''):
    """
    渲染完整的HTML picture元素
    用法: {% responsive_picture article.featured_image 'img-responsive' %}
    """
    if not image:
        return {'picture_data': None}
    
    picture_data = get_picture_element_data(image)
    return {
        'picture_data': picture_data,
        'css_class': css_class,
        'alt_text': alt_text or getattr(image, 'description', '') or image.title
    }


@register.simple_tag
def image_specs_json(image):
    """
    返回图片所有规格的JSON数据（用于JavaScript）
    用法: {% image_specs_json article.featured_image %}
    """
    import json
    if not image:
        return '{}'
    
    data = ImageURLGenerator.get_rendition_urls(image)
    return mark_safe(json.dumps(data))


@register.simple_tag
def hero_image_data(image):
    """
    获取轮播图相关数据
    用法: {% hero_image_data hero_image as hero_data %}
    """
    if not image:
        return {}
    
    return {
        'desktop': image_data(image, 'hero_desktop'),
        'mobile': image_data(image, 'hero_mobile'),
    }


@register.simple_tag 
def card_image_data(image, size='medium'):
    """
    获取卡片图片数据
    用法: {% card_image_data article.featured_image 'large' as card_data %}
    """
    if not image:
        return {}
    
    spec_map = {
        'small': 'card_small',
        'medium': 'card_medium', 
        'large': 'card_large'
    }
    
    spec_name = spec_map.get(size, 'card_medium')
    return image_data(image, spec_name)


@register.simple_tag
def social_meta_images(image):
    """
    获取社交媒体分享图数据
    用法: {% social_meta_images article.featured_image as social_images %}
    """
    if not image:
        return {}
    
    return {
        'og_image': image_url(image, 'og_image'),
        'twitter_card': image_url(image, 'twitter_card'),
    }
