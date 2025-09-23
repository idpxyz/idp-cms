# Channel模型升级方案

## 📋 概述
为了支持可配置的频道条带显示，需要扩展Channel模型添加相关配置字段。

## 🎯 Django模型定义

### 1. 扩展Channel模型

```python
# cms/models/channel.py (或相应的模型文件)
from django.db import models
import json

class Channel(models.Model):
    # 现有字段
    name = models.CharField(max_length=100, verbose_name='频道名称')
    slug = models.SlugField(max_length=100, unique=True, verbose_name='频道标识')
    order = models.IntegerField(default=0, verbose_name='显示顺序')
    
    # 🆕 首页显示配置 (JSON字段)
    homepage_display = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='首页显示配置',
        help_text='配置频道在首页的显示方式'
    )
    
    # 🆕 响应式配置 (JSON字段)
    responsive_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='响应式配置',
        help_text='不同设备上的显示配置'
    )
    
    # 🆕 显示配置 (JSON字段)
    display_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='显示配置',
        help_text='频道的视觉配置'
    )
    
    # 🆕 业务配置字段
    is_featured = models.BooleanField(default=False, verbose_name='特色频道')
    requires_subscription = models.BooleanField(default=False, verbose_name='需要订阅')
    content_type = models.CharField(
        max_length=20,
        choices=[
            ('news', '新闻'),
            ('analysis', '分析'),
            ('opinion', '观点'),
        ],
        default='news',
        verbose_name='内容类型'
    )
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cms_channel'
        verbose_name = '频道'
        verbose_name_plural = '频道'
        ordering = ['order', 'id']
    
    def __str__(self):
        return self.name
    
    # 🆕 工具方法
    @property
    def should_show_strip(self):
        """是否在首页显示条带"""
        return self.homepage_display.get('show_strip', True)
    
    @property
    def strip_order(self):
        """条带显示顺序"""
        return self.homepage_display.get('strip_order', self.order)
    
    @property
    def strip_priority(self):
        """条带优先级"""
        return self.homepage_display.get('strip_priority', 'medium')
    
    @property
    def article_limit(self):
        """文章显示数量"""
        return self.homepage_display.get('article_limit', 6)
    
    @property
    def show_categories(self):
        """是否显示分类"""
        return self.homepage_display.get('show_categories', True)
```

### 2. 数据库迁移脚本

```python
# cms/migrations/xxxx_add_channel_configuration_fields.py
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('cms', '前一个迁移文件'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='homepage_display',
            field=models.JSONField(
                default=dict,
                blank=True,
                verbose_name='首页显示配置',
                help_text='配置频道在首页的显示方式'
            ),
        ),
        migrations.AddField(
            model_name='channel',
            name='responsive_config',
            field=models.JSONField(
                default=dict,
                blank=True,
                verbose_name='响应式配置',
                help_text='不同设备上的显示配置'
            ),
        ),
        migrations.AddField(
            model_name='channel',
            name='display_config',
            field=models.JSONField(
                default=dict,
                blank=True,
                verbose_name='显示配置',
                help_text='频道的视觉配置'
            ),
        ),
        migrations.AddField(
            model_name='channel',
            name='is_featured',
            field=models.BooleanField(default=False, verbose_name='特色频道'),
        ),
        migrations.AddField(
            model_name='channel',
            name='requires_subscription',
            field=models.BooleanField(default=False, verbose_name='需要订阅'),
        ),
        migrations.AddField(
            model_name='channel',
            name='content_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('news', '新闻'),
                    ('analysis', '分析'),
                    ('opinion', '观点'),
                ],
                default='news',
                verbose_name='内容类型'
            ),
        ),
    ]
```

### 3. 序列化器更新

```python
# cms/serializers/channel.py
from rest_framework import serializers
from ..models import Channel

class ChannelSerializer(serializers.ModelSerializer):
    # 计算字段
    should_show_strip = serializers.ReadOnlyField()
    strip_order = serializers.ReadOnlyField()
    strip_priority = serializers.ReadOnlyField()
    article_limit = serializers.ReadOnlyField()
    show_categories = serializers.ReadOnlyField()
    
    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'slug', 'order',
            'homepage_display', 'responsive_config', 'display_config',
            'is_featured', 'requires_subscription', 'content_type',
            'created_at', 'updated_at',
            # 计算字段
            'should_show_strip', 'strip_order', 'strip_priority',
            'article_limit', 'show_categories'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_homepage_display(self, value):
        """验证首页显示配置"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("首页显示配置必须是字典格式")
        
        # 验证具体字段
        if 'show_strip' in value and not isinstance(value['show_strip'], bool):
            raise serializers.ValidationError("show_strip必须是布尔值")
        
        if 'strip_order' in value and not isinstance(value['strip_order'], int):
            raise serializers.ValidationError("strip_order必须是整数")
        
        if 'strip_priority' in value and value['strip_priority'] not in ['high', 'medium', 'low']:
            raise serializers.ValidationError("strip_priority必须是high/medium/low之一")
        
        if 'article_limit' in value:
            limit = value['article_limit']
            if not isinstance(limit, int) or limit < 1 or limit > 20:
                raise serializers.ValidationError("article_limit必须是1-20之间的整数")
        
        return value
```

### 4. 管理后台配置

```python
# cms/admin.py
from django.contrib import admin
from django.forms import widgets
from .models import Channel

@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'order', 'is_featured', 'should_show_strip', 'strip_priority']
    list_filter = ['is_featured', 'requires_subscription', 'content_type']
    search_fields = ['name', 'slug']
    ordering = ['order', 'name']
    
    fieldsets = [
        ('基本信息', {
            'fields': ['name', 'slug', 'order']
        }),
        ('业务配置', {
            'fields': ['is_featured', 'requires_subscription', 'content_type']
        }),
        ('首页显示配置', {
            'fields': ['homepage_display'],
            'classes': ['collapse'],
            'description': '配置频道在首页的显示方式'
        }),
        ('响应式配置', {
            'fields': ['responsive_config'],
            'classes': ['collapse'],
            'description': '不同设备上的显示配置'
        }),
        ('显示配置', {
            'fields': ['display_config'],
            'classes': ['collapse'],
            'description': '频道的视觉配置'
        }),
    ]
    
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """为JSON字段提供更好的编辑器"""
        if db_field.name in ['homepage_display', 'responsive_config', 'display_config']:
            kwargs['widget'] = widgets.Textarea(attrs={'rows': 10, 'cols': 80})
        return super().formfield_for_dbfield(db_field, request, **kwargs)
```

## 🗄️ 默认数据示例

### 为现有频道设置默认配置

```python
# cms/management/commands/setup_channel_defaults.py
from django.core.management.base import BaseCommand
from cms.models import Channel

class Command(BaseCommand):
    help = '为现有频道设置默认配置'
    
    def handle(self, *args, **options):
        # 示例配置
        default_configs = {
            'tech': {
                'homepage_display': {
                    'show_strip': True,
                    'strip_order': 1,
                    'strip_priority': 'high',
                    'article_limit': 6,
                    'show_categories': True
                },
                'display_config': {
                    'color_theme': '#3B82F6',
                    'description': '最新科技资讯和趋势分析'
                }
            },
            'finance': {
                'homepage_display': {
                    'show_strip': True,
                    'strip_order': 2,
                    'strip_priority': 'high',
                    'article_limit': 6,
                    'show_categories': True
                },
                'display_config': {
                    'color_theme': '#10B981',
                    'description': '财经新闻和市场分析'
                }
            },
            'culture': {
                'homepage_display': {
                    'show_strip': True,
                    'strip_order': 3,
                    'strip_priority': 'medium',
                    'article_limit': 4,
                    'show_categories': True
                },
                'display_config': {
                    'color_theme': '#8B5CF6',
                    'description': '文化艺术和社会生活'
                }
            }
        }
        
        for slug, config in default_configs.items():
            try:
                channel = Channel.objects.get(slug=slug)
                channel.homepage_display = config.get('homepage_display', {})
                channel.display_config = config.get('display_config', {})
                channel.save()
                self.stdout.write(
                    self.style.SUCCESS(f'成功更新频道 {channel.name} 的配置')
                )
            except Channel.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'频道 {slug} 不存在，跳过')
                )
```

## 🚀 部署步骤

1. **运行迁移**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **设置默认配置**:
   ```bash
   python manage.py setup_channel_defaults
   ```

3. **重启服务**:
   ```bash
   # 重启Django应用
   supervisorctl restart cms
   ```

## 📊 API返回示例

```json
{
  "channels": [
    {
      "id": "tech",
      "name": "科技",
      "slug": "tech",
      "order": 1,
      "homepage_display": {
        "show_strip": true,
        "strip_order": 1,
        "strip_priority": "high",
        "article_limit": 6,
        "show_categories": true
      },
      "responsive_config": {
        "mobile": {
          "show_strip": true,
          "article_limit": 4
        },
        "desktop": {
          "show_strip": true,
          "article_limit": 8
        }
      },
      "display_config": {
        "color_theme": "#3B82F6",
        "description": "最新科技资讯和趋势分析"
      },
      "is_featured": true,
      "content_type": "news"
    }
  ]
}
```

## ✅ 验证清单

- [ ] 数据库迁移成功
- [ ] 现有数据完整性保持
- [ ] API返回新字段
- [ ] 前端正确解析配置
- [ ] 管理后台可以编辑配置
- [ ] 默认值正常工作
