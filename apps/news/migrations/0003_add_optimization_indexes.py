# Generated manually for adding optimization indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0002_align_article_model_with_design'),
    ]

    operations = [
        # 添加优化查询性能的索引
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['publish_at', 'channel_id', 'region_id'], name='art_pub_chan_reg_opt'),
        ),
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['is_featured', 'weight', 'publish_at'], name='art_feat_weight_pub_opt'),
        ),
    ]
