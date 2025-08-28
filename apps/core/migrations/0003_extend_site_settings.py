# Generated manually for extending SiteSettings model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_add_tagging_support'),
    ]

    operations = [
        # 功能开关配置
        migrations.AddField(
            model_name='sitesettings',
            name='recommendation',
            field=models.BooleanField(default=True, verbose_name='推荐功能'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='search_enabled',
            field=models.BooleanField(default=True, verbose_name='搜索功能'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='comments_enabled',
            field=models.BooleanField(default=False, verbose_name='评论系统'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='user_registration',
            field=models.BooleanField(default=True, verbose_name='用户注册'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='social_login',
            field=models.BooleanField(default=False, verbose_name='社交登录'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='content_moderation',
            field=models.BooleanField(default=False, verbose_name='内容审核'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='api_access',
            field=models.BooleanField(default=True, verbose_name='API访问'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='rss_feed',
            field=models.BooleanField(default=True, verbose_name='RSS订阅'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='sitemap',
            field=models.BooleanField(default=True, verbose_name='站点地图'),
        ),
        
        # UI主题配置
        migrations.AddField(
            model_name='sitesettings',
            name='theme',
            field=models.CharField(default='default', max_length=50, verbose_name='主题'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='primary_color',
            field=models.CharField(default='#3B82F6', max_length=7, verbose_name='主色调'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='secondary_color',
            field=models.CharField(default='#6B7280', max_length=7, verbose_name='辅助色'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='font_family',
            field=models.CharField(default='Inter, sans-serif', max_length=100, verbose_name='字体'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='logo_url',
            field=models.URLField(blank=True, verbose_name='Logo URL'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='favicon_url',
            field=models.URLField(blank=True, verbose_name='Favicon URL'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='show_breadcrumbs',
            field=models.BooleanField(default=True, verbose_name='显示面包屑'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='show_reading_time',
            field=models.BooleanField(default=True, verbose_name='显示阅读时间'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='dark_mode_enabled',
            field=models.BooleanField(default=True, verbose_name='深色模式'),
        ),
        
        # SEO配置扩展
        migrations.AddField(
            model_name='sitesettings',
            name='robots_txt_enabled',
            field=models.BooleanField(default=True, verbose_name='启用robots.txt'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='structured_data',
            field=models.BooleanField(default=True, verbose_name='结构化数据'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='social_meta_tags',
            field=models.BooleanField(default=True, verbose_name='社交元标签'),
        ),
        
        # 分析配置扩展
        migrations.AddField(
            model_name='sitesettings',
            name='baidu_analytics_id',
            field=models.CharField(blank=True, max_length=50, verbose_name='百度统计ID'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='track_performance',
            field=models.BooleanField(default=True, verbose_name='跟踪性能'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='retention_days',
            field=models.IntegerField(default=90, verbose_name='数据保留天数'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='export_enabled',
            field=models.BooleanField(default=True, verbose_name='允许数据导出'),
        ),
        
        # 内容配置扩展
        migrations.AddField(
            model_name='sitesettings',
            name='date_format',
            field=models.CharField(default='%Y-%m-%d', max_length=20, verbose_name='日期格式'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='content_retention_days',
            field=models.IntegerField(default=365, verbose_name='内容保留天数'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='auto_publish',
            field=models.BooleanField(default=False, verbose_name='自动发布'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='content_approval_required',
            field=models.BooleanField(default=False, verbose_name='需要内容审核'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='allow_aggregate',
            field=models.BooleanField(default=True, verbose_name='允许内容聚合'),
        ),
        
        # 性能配置扩展
        migrations.AddField(
            model_name='sitesettings',
            name='max_search_results',
            field=models.IntegerField(default=100, verbose_name='最大搜索结果数'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='api_rate_limit',
            field=models.IntegerField(default=1000, verbose_name='API请求限制(每小时)'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='image_compression',
            field=models.BooleanField(default=True, verbose_name='图片压缩'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='cdn_enabled',
            field=models.BooleanField(default=False, verbose_name='启用CDN'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='lazy_loading',
            field=models.BooleanField(default=True, verbose_name='懒加载'),
        ),
        
        # 区域特定配置
        migrations.AddField(
            model_name='sitesettings',
            name='region',
            field=models.CharField(blank=True, max_length=50, verbose_name='所属区域'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='region_order',
            field=models.IntegerField(default=0, verbose_name='区域排序'),
        ),
    ]
