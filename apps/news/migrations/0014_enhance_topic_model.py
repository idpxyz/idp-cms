# Enhanced Topic model with template system and new fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0013_alter_articlepage_categories_and_more'),
    ]

    operations = [
        # Create TopicTemplate model
        migrations.CreateModel(
            name='TopicTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='如：突发事件专题模板', max_length=100, verbose_name='模板名称')),
                ('slug', models.SlugField(help_text='如：breaking，用于匹配专题标签', unique=True, verbose_name='模板标识')),
                ('file_name', models.CharField(help_text='如：BreakingTopicTemplate.tsx', max_length=100, verbose_name='模板文件名')),
                ('description', models.TextField(blank=True, verbose_name='描述')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('is_default', models.BooleanField(default=False, verbose_name='是否为默认模板')),
                ('order', models.IntegerField(default=0, verbose_name='排序')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': '专题模板',
                'verbose_name_plural': '专题模板',
                'db_table': 'news_topic_template',
                'ordering': ['order', 'name'],
            },
        ),
        
        # Add new fields to Topic model
        migrations.AddField(
            model_name='topic',
            name='importance_level',
            field=models.CharField(
                choices=[
                    ('national', '国家级'),
                    ('major', '重大级'),
                    ('regional', '区域级'),
                    ('specialized', '专门级')
                ],
                default='major',
                help_text='根据事件影响范围选择重要程度',
                max_length=16,
                verbose_name='重要程度'
            ),
        ),
        migrations.AddField(
            model_name='topic',
            name='status',
            field=models.CharField(
                choices=[
                    ('upcoming', '即将开始'),
                    ('ongoing', '正在进行'),
                    ('concluded', '已结束'),
                    ('archived', '已归档'),
                    ('memorial', '纪念回顾')
                ],
                default='upcoming',
                help_text='专题当前的生命周期状态',
                max_length=16,
                verbose_name='专题状态'
            ),
        ),
        migrations.AddField(
            model_name='topic',
            name='is_breaking',
            field=models.BooleanField(
                default=False,
                help_text='突发事件会获得最高展示优先级',
                verbose_name='是否突发重大事件'
            ),
        ),
        migrations.AddField(
            model_name='topic',
            name='priority_weight',
            field=models.IntegerField(
                default=100,
                help_text='数值越大优先级越高，范围：1-2000，突发事件可设置为1000+',
                verbose_name='优先权重'
            ),
        ),
        migrations.AddField(
            model_name='topic',
            name='template',
            field=models.ForeignKey(
                blank=True,
                help_text='选择专题的显示模板，如突发事件模板、国家级专题模板等',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='news.topictemplate',
                verbose_name='专题模板'
            ),
        ),
        
        # Update Topic model help text and verbose names
        migrations.AlterField(
            model_name='topic',
            name='title',
            field=models.CharField(
                help_text='简洁明确的专题标题，如：四川6.8级地震救援',
                max_length=128,
                verbose_name='专题标题'
            ),
        ),
        migrations.AlterField(
            model_name='topic',
            name='slug',
            field=models.SlugField(
                help_text='用于URL的唯一标识符',
                unique=True,
                verbose_name='专题标识符'
            ),
        ),
        migrations.AlterField(
            model_name='topic',
            name='summary',
            field=models.TextField(
                blank=True,
                help_text='专题的简要描述，用于SEO和分享',
                verbose_name='专题摘要'
            ),
        ),
        migrations.AlterField(
            model_name='topic',
            name='is_active',
            field=models.BooleanField(
                default=True,
                help_text='控制专题是否在前台显示',
                verbose_name='是否启用'
            ),
        ),
        migrations.AlterField(
            model_name='topic',
            name='is_featured',
            field=models.BooleanField(
                default=False,
                help_text='是否在首页等重要位置推荐展示',
                verbose_name='是否推荐'
            ),
        ),
        # Note: tags field keeps its existing TaggableManager configuration
        # We just update the help_text through model definition
        
        # Update Topic model Meta options
        migrations.AlterModelOptions(
            name='topic',
            options={
                'verbose_name': '重大事件专题',
                'verbose_name_plural': '重大事件专题',
                'ordering': ['-is_breaking', '-priority_weight', '-is_featured', 'order', '-start_date'],
            },
        ),
        
        # Add new database indexes
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['importance_level', 'status'], name='news_topic_import_status_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['status', 'is_active'], name='news_topic_status_active_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['-priority_weight', '-created_at'], name='news_topic_priority_created_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['is_breaking', 'is_featured'], name='news_topic_breaking_featured_idx'),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['template', 'is_active'], name='news_topic_template_active_idx'),
        ),
    ]
