# Generated manually to refactor models to directory structure

from django.db import migrations, models
import django.db.models.deletion
import modelcluster.fields
from modelcluster.models import ClusterableModel
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_sitesettings_customized_sitesettings_theme_version_and_more'),
    ]

    operations = [
        # Remove old SEO fields
        migrations.RemoveField(
            model_name='sitesettings',
            name='default_description',
        ),
        migrations.RemoveField(
            model_name='sitesettings',
            name='default_keywords',
        ),
        migrations.RemoveField(
            model_name='sitesettings',
            name='default_title',
        ),
        
        # Add new SEO fields
        migrations.AddField(
            model_name='sitesettings',
            name='site_title',
            field=models.CharField(blank=True, help_text='站点的主标题，用于首页和全局SEO', max_length=200, verbose_name='站点标题'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='site_description',
            field=models.TextField(blank=True, help_text='站点的主描述，用于首页和全局SEO', verbose_name='站点描述'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='site_keywords',
            field=models.TextField(blank=True, help_text='站点的核心关键词，用于首页SEO', verbose_name='站点关键词'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='page_title_template',
            field=models.CharField(blank=True, help_text='页面标题模板，如：{title} - {site_name}', max_length=200, verbose_name='页面标题模板'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='page_description_template',
            field=models.TextField(blank=True, help_text='页面描述的默认模板', verbose_name='页面描述模板'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='auto_seo_enabled',
            field=models.BooleanField(default=True, help_text='是否自动生成页面的SEO信息', verbose_name='启用自动SEO'),
        ),
        
        # Add display settings
        migrations.AddField(
            model_name='sitesettings',
            name='show_author',
            field=models.BooleanField(default=True, verbose_name='显示作者'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='show_date',
            field=models.BooleanField(default=True, verbose_name='显示日期'),
        ),
        
        # Add custom settings JSON field
        migrations.AddField(
            model_name='sitesettings',
            name='custom_settings',
            field=models.JSONField(blank=True, default=dict, verbose_name='自定义配置'),
        ),
        
        # Add timestamps to models
        migrations.AddField(
            model_name='customconfigitem',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, verbose_name='创建时间'),
        ),
        migrations.AddField(
            model_name='customconfigitem',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='更新时间'),
        ),
        migrations.AddField(
            model_name='customconfigitem',
            name='value',
            field=models.JSONField(blank=True, default=dict, verbose_name='配置值'),
        ),
        
        migrations.AddField(
            model_name='language',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, verbose_name='创建时间'),
        ),
        migrations.AddField(
            model_name='language',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='更新时间'),
        ),
        
        migrations.AddField(
            model_name='theme',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, verbose_name='创建时间'),
        ),
        migrations.AddField(
            model_name='theme',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='更新时间'),
        ),
        migrations.AddField(
            model_name='theme',
            name='configuration',
            field=models.JSONField(blank=True, default=dict, verbose_name='主题配置'),
        ),
        
        migrations.AddField(
            model_name='font',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, verbose_name='创建时间'),
        ),
        migrations.AddField(
            model_name='font',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='更新时间'),
        ),
        
        migrations.AddField(
            model_name='timezone',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, verbose_name='创建时间'),
        ),
        migrations.AddField(
            model_name='timezone',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='更新时间'),
        ),
        
        migrations.AddField(
            model_name='dateformat',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, verbose_name='创建时间'),
        ),
        migrations.AddField(
            model_name='dateformat',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='更新时间'),
        ),
        
        # Create Comment model
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('author_name', models.CharField(help_text='未登录用户的显示名称', max_length=100, verbose_name='作者名称')),
                ('author_email', models.EmailField(help_text='用于接收回复通知', max_length=254, verbose_name='作者邮箱')),
                ('content', models.TextField(verbose_name='评论内容')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('status', models.CharField(choices=[('pending', '待审核'), ('approved', '已通过'), ('rejected', '已拒绝'), ('spam', '垃圾评论')], default='pending', max_length=20, verbose_name='状态')),
                ('is_public', models.BooleanField(default=False, help_text='只有公开的评论才会显示', verbose_name='是否公开')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP地址')),
                ('user_agent', models.TextField(blank=True, verbose_name='User Agent')),
                ('spam_score', models.FloatField(default=0.0, help_text='自动检测的垃圾评论可能性得分', verbose_name='垃圾评论得分')),
                ('author', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='comments', to='auth.user', verbose_name='作者')),
                ('page', modelcluster.fields.ParentalKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='wagtailcore.page', verbose_name='页面')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='core.comment', verbose_name='父评论')),
            ],
            options={
                'verbose_name': '评论',
                'verbose_name_plural': '评论',
                'db_table': 'core_comment',
                'ordering': ['-created_at'],
            },
            bases=(models.Model,),
        ),
    ]
