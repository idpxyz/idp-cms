# Generated manually for aligning ArticlePage model with design requirements

from django.db import migrations, models
import django.db.models.deletion
import wagtail.fields


class Migration(migrations.Migration):

    dependencies = [
        ('wagtailimages', '0025_alter_image_file_alter_rendition_file'),
        ('wagtailcore', '0094_alter_page_locale'),
        ('core', '0001_initial'),
        ('news', '0001_initial'),
    ]

    operations = [
        # 重命名字段
        migrations.RenameField(
            model_name='articlepage',
            old_name='introduction',
            new_name='excerpt',
        ),
        
        # 添加新字段
        migrations.AddField(
            model_name='articlepage',
            name='cover',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='wagtailimages.image', verbose_name='封面图片'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='channel',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='articles', to='core.channel', verbose_name='频道'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='region_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='articles', to='core.region', verbose_name='地区'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='source_site',
            field=models.ForeignKey(blank=True, help_text='文章的原始来源站点', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sourced_articles', to='wagtailcore.site', verbose_name='来源站点'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='allow_aggregate',
            field=models.BooleanField(default=True, help_text='是否允许在其他站点聚合显示', verbose_name='允许聚合'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='canonical_url',
            field=models.URLField(blank=True, help_text='SEO规范链接，通常指向原始发布地址', verbose_name='规范链接'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='is_featured',
            field=models.BooleanField(default=False, help_text='是否在首页或频道页置顶显示', verbose_name='置顶推荐'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='weight',
            field=models.IntegerField(default=0, help_text='数值越大权重越高，影响排序', verbose_name='权重'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='publish_at',
            field=models.DateTimeField(blank=True, help_text='实际发布时间，可不同于创建时间', null=True, verbose_name='发布时间'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='更新时间'),
        ),
        
        # 修改现有字段
        migrations.AlterField(
            model_name='articlepage',
            name='body',
            field=wagtail.fields.RichTextField(features=['bold', 'italic', 'link', 'image'], verbose_name='正文内容'),
        ),
        migrations.AlterField(
            model_name='articlepage',
            name='topic_slug',
            field=models.SlugField(blank=True, help_text='用于专题聚合的标识符', verbose_name='专题标识'),
        ),
        migrations.AlterField(
            model_name='articlepage',
            name='author_name',
            field=models.CharField(blank=True, help_text='记者或作者姓名', max_length=64, verbose_name='作者'),
        ),
        migrations.AlterField(
            model_name='articlepage',
            name='language',
            field=models.CharField(choices=[('zh', '中文'), ('en', 'English'), ('ja', '日本語'), ('ko', '한국어')], default='zh', max_length=8, verbose_name='语言'),
        ),
        migrations.AlterField(
            model_name='articlepage',
            name='has_video',
            field=models.BooleanField(default=False, help_text='标记是否包含视频内容', verbose_name='包含视频'),
        ),
        
        # 删除旧字段
        migrations.RemoveField(
            model_name='articlepage',
            name='channel_slug',
        ),
        migrations.RemoveField(
            model_name='articlepage',
            name='region',
        ),
        
        # 重命名新的region字段
        migrations.RenameField(
            model_name='articlepage',
            old_name='region_fk',
            new_name='region',
        ),
        
        # 添加索引
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['publish_at', 'channel', 'region'], name='art_pub_chan_reg'),
        ),
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['is_featured', 'weight', 'publish_at'], name='art_feat_weight_pub'),
        ),
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['language', 'region'], name='art_lang_region'),
        ),
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['has_video', 'is_featured'], name='art_video_feat'),
        ),
    ]
