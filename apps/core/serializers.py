"""
DRF Schema 验证系统

实施 BestThemeOptimize.md 的后端类型安全策略：
- 强校验 brand_tokens 和 modules JSON 字段
- 自定义验证器，确保数据质量
- 错误消息友好，便于调试
"""

import json
import re
from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import SiteSettings


class ColorField(serializers.CharField):
    """颜色值验证字段"""
    
    def __init__(self, **kwargs):
        kwargs.setdefault('max_length', 7)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        
        # 验证十六进制颜色格式
        color_pattern = r'^#([0-9A-Fa-f]{3}){1,2}$'
        if not re.match(color_pattern, value):
            raise serializers.ValidationError(
                f"'{value}' 不是有效的十六进制颜色值。格式应为 #RRGGBB 或 #RGB"
            )
        
        return value


class CSSUnitField(serializers.CharField):
    """CSS 单位值验证字段"""
    
    def __init__(self, **kwargs):
        kwargs.setdefault('max_length', 20)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        
        # 验证CSS单位格式
        css_unit_pattern = r'^[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)$'
        if not re.match(css_unit_pattern, value):
            raise serializers.ValidationError(
                f"'{value}' 不是有效的CSS单位值。格式应为数字+单位，如 '1rem', '10px', '100%'"
            )
        
        return value


class BrandTokensField(serializers.JSONField):
    """品牌设计令牌验证字段"""
    
    # 允许的令牌键
    ALLOWED_TOKENS = {
        # 颜色令牌
        'primary', 'secondary', 'accent', 'background', 'surface',
        'error', 'warning', 'success', 'info',
        
        # 文本颜色
        'text-primary', 'text-secondary', 'text-muted', 'text-inverse',
        
        # 间距令牌
        'spacing-xs', 'spacing-sm', 'spacing-md', 'spacing-lg', 'spacing-xl', 'spacing-2xl',
        
        # 字体令牌
        'font-family-base', 'font-family-heading', 'font-family-mono',
        
        # 字号令牌
        'font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg',
        'font-size-xl', 'font-size-2xl', 'font-size-3xl',
        
        # 圆角令牌
        'radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-full',
    }
    
    # 颜色相关的令牌
    COLOR_TOKENS = {
        'primary', 'secondary', 'accent', 'background', 'surface',
        'error', 'warning', 'success', 'info',
        'text-primary', 'text-secondary', 'text-muted', 'text-inverse',
    }
    
    # CSS单位相关的令牌
    CSS_UNIT_TOKENS = {
        'spacing-xs', 'spacing-sm', 'spacing-md', 'spacing-lg', 'spacing-xl', 'spacing-2xl',
        'font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg',
        'font-size-xl', 'font-size-2xl', 'font-size-3xl',
        'radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-full',
    }
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("品牌令牌必须是一个对象")
        
        # 验证键的合法性
        invalid_keys = set(value.keys()) - self.ALLOWED_TOKENS
        if invalid_keys:
            raise serializers.ValidationError(
                f"不允许的令牌键: {', '.join(invalid_keys)}. "
                f"允许的键: {', '.join(sorted(self.ALLOWED_TOKENS))}"
            )
        
        # 验证值的格式
        errors = {}
        for key, val in value.items():
            if not isinstance(val, str):
                errors[key] = "令牌值必须是字符串"
                continue
            
            try:
                if key in self.COLOR_TOKENS:
                    # 验证颜色值
                    ColorField().to_internal_value(val)
                elif key in self.CSS_UNIT_TOKENS:
                    # 验证CSS单位值
                    CSSUnitField().to_internal_value(val)
                elif key.startswith('font-family-'):
                    # 验证字体家族
                    if len(val) > 200:
                        errors[key] = "字体家族名称过长（最大200字符）"
                    elif len(val.strip()) == 0:
                        errors[key] = "字体家族名称不能为空"
            except serializers.ValidationError as e:
                errors[key] = str(e.detail[0]) if hasattr(e.detail, '__getitem__') else str(e.detail)
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return value


class ModulesField(serializers.JSONField):
    """模块配置验证字段"""
    
    # 允许的模块名称
    ALLOWED_MODULES = {
        # 门户模块
        'hero', 'stats', 'features', 'news-grid', 'featured-carousel', 'cta',
        
        # 地方站模块
        'local-hero', 'local-news', 'local-events',
        
        # 侧边栏模块
        'weather', 'traffic', 'services', 'contact', 'trending', 'categories',
        'newsletter', 'ranking', 'ads',
    }
    
    # 允许的区域
    ALLOWED_AREAS = {'home', 'sidebar', 'header', 'footer'}
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("模块配置必须是一个对象")
        
        # 验证区域键的合法性
        invalid_areas = set(value.keys()) - self.ALLOWED_AREAS
        if invalid_areas:
            raise serializers.ValidationError(
                f"不允许的区域: {', '.join(invalid_areas)}. "
                f"允许的区域: {', '.join(sorted(self.ALLOWED_AREAS))}"
            )
        
        # 验证模块列表
        errors = {}
        for area, modules in value.items():
            if not isinstance(modules, list):
                errors[area] = "模块列表必须是数组"
                continue
            
            # 检查模块名称
            invalid_modules = []
            for module in modules:
                if not isinstance(module, str):
                    errors[area] = f"模块名称必须是字符串，但发现: {type(module).__name__}"
                    break
                elif module not in self.ALLOWED_MODULES:
                    invalid_modules.append(module)
            
            if invalid_modules:
                errors[area] = (
                    f"不允许的模块: {', '.join(invalid_modules)}. "
                    f"允许的模块: {', '.join(sorted(self.ALLOWED_MODULES))}"
                )
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return value


class ThemeKeyField(serializers.ChoiceField):
    """主题键验证字段"""
    
    def __init__(self, **kwargs):
        choices = [
            ('portal', '门户主题'),
            ('localsite-default', '通用地方站主题'),
            ('magazine', '杂志主题'),
        ]
        kwargs['choices'] = choices
        super().__init__(**kwargs)


class ThemeVersionField(serializers.CharField):
    """主题版本验证字段"""
    
    def __init__(self, **kwargs):
        kwargs.setdefault('max_length', 16)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        
        # 验证语义化版本格式
        semver_pattern = r'^\d+\.\d+\.\d+$'
        if not re.match(semver_pattern, value):
            raise serializers.ValidationError(
                f"'{value}' 不是有效的语义化版本号。格式应为 'x.y.z'，如 '1.0.0'"
            )
        
        return value


class SiteSettingsSerializer(serializers.ModelSerializer):
    """站点设置序列化器"""
    
    # 使用自定义字段
    theme_key = ThemeKeyField()
    theme_version = ThemeVersionField()
    brand_tokens = BrandTokensField()
    modules = ModulesField()
    
    # 基本验证
    brand_name = serializers.CharField(max_length=200, allow_blank=True)
    default_title = serializers.CharField(max_length=200, allow_blank=True)
    default_description = serializers.CharField(max_length=500, allow_blank=True)
    primary_color = ColorField(allow_blank=True)
    
    class Meta:
        model = SiteSettings
        fields = [
            'theme_key', 'theme_version', 'layout_key', 'brand_tokens', 'modules',
            'customized', 'brand_name', 'default_title', 'default_description',
            'primary_color', 'cache_timeout',
        ]
    
    def validate_cache_timeout(self, value):
        """验证缓存超时时间"""
        if value < 60:
            raise serializers.ValidationError("缓存超时时间不能少于60秒")
        if value > 86400:
            raise serializers.ValidationError("缓存超时时间不能超过86400秒（24小时）")
        return value
    
    def validate_layout_key(self, value):
        """验证布局键"""
        if len(value) > 64:
            raise serializers.ValidationError("布局键长度不能超过64字符")
        
        # 可以添加更多布局键的验证逻辑
        allowed_layouts = {
            'layout-portal-classic', 'layout-portal-modern', 'layout-portal-magazine',
            'layout-localsite-grid', 'layout-localsite-list', 'layout-localsite-masonry',
            'layout-magazine', 'layout-magazine-minimal', 'layout-magazine-editorial',
        }
        
        if value not in allowed_layouts:
            raise serializers.ValidationError(
                f"不支持的布局键: {value}. "
                f"支持的布局: {', '.join(sorted(allowed_layouts))}"
            )
        
        return value
    
    def validate(self, attrs):
        """全局验证"""
        # 验证主题和布局的兼容性
        theme_key = attrs.get('theme_key')
        layout_key = attrs.get('layout_key')
        
        if theme_key and layout_key:
            # 定义主题和布局的兼容性映射
            theme_layout_compatibility = {
                'portal': ['layout-portal-classic', 'layout-portal-modern', 'layout-portal-magazine'],
                'localsite-default': ['layout-localsite-grid', 'layout-localsite-list', 'layout-localsite-masonry'],
                'magazine': ['layout-magazine', 'layout-magazine-minimal', 'layout-magazine-editorial'],
            }
            
            compatible_layouts = theme_layout_compatibility.get(theme_key, [])
            if layout_key not in compatible_layouts:
                raise serializers.ValidationError({
                    'layout_key': f"布局 '{layout_key}' 与主题 '{theme_key}' 不兼容。"
                                 f"兼容的布局: {', '.join(compatible_layouts)}"
                })
        
        return attrs


def validate_site_settings_data(data):
    """
    独立的验证函数，可在视图中使用
    
    Args:
        data: 要验证的数据字典
        
    Returns:
        tuple: (is_valid, validated_data, errors)
    """
    serializer = SiteSettingsSerializer(data=data)
    
    try:
        if serializer.is_valid(raise_exception=True):
            return True, serializer.validated_data, None
    except serializers.ValidationError as e:
        return False, None, e.detail
    except Exception as e:
        return False, None, {'non_field_errors': [str(e)]}


# 导出常量供其他模块使用
ALLOWED_THEME_KEYS = ['portal', 'localsite-default', 'magazine']
ALLOWED_MODULES = list(ModulesField.ALLOWED_MODULES)
ALLOWED_MODULE_AREAS = list(ModulesField.ALLOWED_AREAS)
ALLOWED_BRAND_TOKENS = list(BrandTokensField.ALLOWED_TOKENS)
