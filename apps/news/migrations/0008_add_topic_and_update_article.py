# Generated manually for Topic model and ArticlePage updates
from django.db import migrations, models
import django.db.models.deletion
import modelcluster.fields
import taggit.managers


class Migration(migrations.Migration):

    dependencies = [
        ('taggit', '0005_auto_20220424_2025'),
        ('wagtailimages', '0025_alter_image_file_alter_rendition_file'),
        ('core', '0021_add_category_model'),
        ('news', '0007_add_articlepagetag_site'),
    ]

    operations = [
        migrations.CreateModel(
            name='Topic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=128, verbose_name='专题标题')),
                ('slug', models.SlugField(unique=True, verbose_name='专题标识符')),
                ('summary', models.TextField(blank=True, verbose_name='专题摘要')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('is_featured', models.BooleanField(default=False, verbose_name='是否推荐')),
                ('order', models.IntegerField(default=0, verbose_name='排序')),
                ('start_date', models.DateTimeField(blank=True, null=True, verbose_name='专题开始时间')),
                ('end_date', models.DateTimeField(blank=True, null=True, verbose_name='专题结束时间')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('cover_image', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='wagtailimages.image', verbose_name='专题封面图片')),
                ('sites', models.ManyToManyField(blank=True, to='wagtailcore.site', verbose_name='关联站点')),
            ],
            options={
                'verbose_name': '专题',
                'verbose_name_plural': '专题',
                'db_table': 'news_topic',
                'ordering': ['-is_featured', 'order', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TopicTaggedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content_object', modelcluster.fields.ParentalKey(on_delete=django.db.models.deletion.CASCADE, related_name='tagged_items', to='news.topic')),
                ('tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(app_label)s_%(class)s_items', to='taggit.tag')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='topic',
            name='tags',
            field=taggit.managers.TaggableManager(blank=True, through='news.TopicTaggedItem', to='taggit.Tag', verbose_name='标签'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='categories',
            field=models.ManyToManyField(blank=True, help_text='选择文章所属的分类（可多选）', related_name='articles', to='core.category', verbose_name='分类'),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='topic',
            field=models.ForeignKey(blank=True, help_text='选择文章所属的专题', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='articles', to='news.topic', verbose_name='专题'),
        ),
        migrations.RemoveField(
            model_name='articlepage',
            name='topic_slug',
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['slug'], name='news_topic_slug_b8479e_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['is_active', 'is_featured'], name='news_topic_is_acti_a4143c_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['start_date', 'end_date'], name='news_topic_start_d_5a116f_idx'),
        ),
    ]
