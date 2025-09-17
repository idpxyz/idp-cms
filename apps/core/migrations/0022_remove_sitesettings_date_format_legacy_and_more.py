# Generated manually to address permission issues
# This migration was created based on dry-run output

from django.db import migrations, models
import django.db.models.deletion
import modelcluster.fields
import wagtail.snippets.models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_add_category_model'),
    ]

    operations = [
        # Remove legacy fields from sitesettings
        migrations.RemoveField(
            model_name='sitesettings',
            name='date_format_legacy',
        ),
        migrations.RemoveField(
            model_name='sitesettings',
            name='default_language_legacy',
        ),
        migrations.RemoveField(
            model_name='sitesettings',
            name='font_family_legacy',
        ),
        migrations.RemoveField(
            model_name='sitesettings',
            name='theme_legacy',
        ),
        migrations.RemoveField(
            model_name='sitesettings',
            name='timezone_legacy',
        ),
        
        # Add new fields to channel
        migrations.AddField(
            model_name='channel',
            name='has_own_template',
            field=models.BooleanField(default=True, help_text='频道是否有独立的展示模板和运营位', verbose_name='是否独立模板'),
        ),
        migrations.AddField(
            model_name='channel',
            name='locale',
            field=models.CharField(default='zh-CN', help_text='频道的主要语言区域', max_length=16, verbose_name='语言区域'),
        ),
        
        # Create Tag model
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=64, unique=True, verbose_name='标签名称')),
                ('slug', models.SlugField(unique=True, verbose_name='标签标识符')),
                ('description', models.TextField(blank=True, help_text='标签的详细说明，便于编辑理解和使用', verbose_name='标签描述')),
                ('category', models.CharField(blank=True, choices=[('topic', '话题标签'), ('location', '地点标签'), ('person', '人物标签'), ('organization', '机构标签'), ('event', '事件标签'), ('other', '其他标签')], help_text='标签的分类类型，便于管理和筛选', max_length=32, verbose_name='标签分类')),
                ('usage_count', models.IntegerField(default=0, help_text='该标签被使用的次数', verbose_name='使用次数')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('is_featured', models.BooleanField(default=False, help_text='推荐标签会在标签云等位置优先显示', verbose_name='是否推荐')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('sites', models.ManyToManyField(blank=True, to='wagtailcore.site', verbose_name='关联站点')),
            ],
            options={
                'verbose_name': '标签',
                'verbose_name_plural': '标签',
                'db_table': 'core_tag',
                'ordering': ['-is_featured', '-usage_count', 'name'],
            },
            bases=(models.Model,),
        ),
        
        # Add indexes for Tag model
        migrations.AddIndex(
            model_name='tag',
            index=models.Index(fields=['slug'], name='core_tag_slug_4ab57c_idx'),
        ),
        migrations.AddIndex(
            model_name='tag',
            index=models.Index(fields=['is_active', 'is_featured'], name='core_tag_is_acti_955787_idx'),
        ),
        migrations.AddIndex(
            model_name='tag',
            index=models.Index(fields=['category', 'usage_count'], name='core_tag_categor_98eb4b_idx'),
        ),
    ]
