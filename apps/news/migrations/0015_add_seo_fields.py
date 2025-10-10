# Add SEO fields to ArticlePage model
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0014_enhance_topic_model'),
        ('media', '0001_initial'),  # For CustomImage reference
    ]

    operations = [
        # Add meta_keywords field
        migrations.AddField(
            model_name='articlepage',
            name='meta_keywords',
            field=models.CharField(
                max_length=255,
                blank=True,
                verbose_name='SEO关键词',
                help_text='SEO关键词，多个关键词用逗号分隔（留空则自动使用标签）'
            ),
        ),
        
        # Add og_image field for social media sharing
        migrations.AddField(
            model_name='articlepage',
            name='og_image',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                to='media.customimage',
                verbose_name='社交分享图片',
                help_text='用于社交媒体分享的专用图片（留空则使用封面图）'
            ),
        ),
        
        # Add structured_data field for Schema.org data
        migrations.AddField(
            model_name='articlepage',
            name='structured_data',
            field=models.JSONField(
                null=True,
                blank=True,
                verbose_name='结构化数据',
                help_text='Schema.org 结构化数据（JSON格式），留空自动生成'
            ),
        ),
    ]

