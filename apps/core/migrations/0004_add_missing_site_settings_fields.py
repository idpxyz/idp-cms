# Generated manually for adding missing SiteSettings fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_extend_site_settings'),
    ]

    operations = [
        # 添加缺失的字段
        migrations.AddField(
            model_name='sitesettings',
            name='default_title',
            field=models.CharField(blank=True, max_length=200, verbose_name='默认页面标题'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='default_description',
            field=models.TextField(blank=True, verbose_name='默认页面描述'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='default_keywords',
            field=models.CharField(blank=True, max_length=500, verbose_name='默认关键词'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='track_user_behavior',
            field=models.BooleanField(default=True, verbose_name='跟踪用户行为'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='timezone',
            field=models.CharField(default='Asia/Shanghai', max_length=50, verbose_name='时区'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='max_articles_per_page',
            field=models.IntegerField(default=20, verbose_name='每页最大文章数'),
        ),
    ]
