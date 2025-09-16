# Generated manually for Category model
from django.db import migrations, models
import django.db.models.deletion
import modelcluster.fields
import taggit.managers


class Migration(migrations.Migration):

    dependencies = [
        ('taggit', '0005_auto_20220424_2025'),
        ('core', '0020_add_slug_to_site'),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=64, verbose_name='分类名称')),
                ('slug', models.SlugField(unique=True, verbose_name='分类标识符')),
                ('description', models.TextField(blank=True, verbose_name='分类描述')),
                ('order', models.IntegerField(default=0, verbose_name='排序')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('channels', models.ManyToManyField(blank=True, help_text='此分类可以出现在哪些频道下', related_name='categories', to='core.channel', verbose_name='关联频道')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='core.category', verbose_name='上级分类')),
                ('sites', models.ManyToManyField(blank=True, to='wagtailcore.site', verbose_name='关联站点')),
            ],
            options={
                'verbose_name': '分类',
                'verbose_name_plural': '分类',
                'db_table': 'core_category',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='CategoryTaggedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content_object', modelcluster.fields.ParentalKey(on_delete=django.db.models.deletion.CASCADE, related_name='tagged_items', to='core.category')),
                ('tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(app_label)s_%(class)s_items', to='taggit.tag')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='category',
            name='tags',
            field=taggit.managers.TaggableManager(blank=True, help_text='为分类添加标签，便于管理和搜索', through='core.CategoryTaggedItem', to='taggit.Tag', verbose_name='标签'),
        ),
        migrations.AddIndex(
            model_name='category',
            index=models.Index(fields=['slug'], name='core_catego_slug_a504e5_idx'),
        ),
        migrations.AddIndex(
            model_name='category',
            index=models.Index(fields=['parent', 'order'], name='core_catego_parent__f0d9c4_idx'),
        ),
        migrations.AddIndex(
            model_name='category',
            index=models.Index(fields=['is_active', 'order'], name='core_catego_is_acti_cae9ec_idx'),
        ),
    ]
