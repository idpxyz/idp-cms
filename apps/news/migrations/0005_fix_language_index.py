# Generated manually to fix language field index

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0004_update_language_field'),
    ]

    operations = [
        # 删除旧的索引
        migrations.RemoveIndex(
            model_name='articlepage',
            name='art_lang_region',
        ),
        
        # 创建新的索引，使用正确的字段名
        migrations.AddIndex(
            model_name='articlepage',
            index=models.Index(fields=['language_id', 'region'], name='art_lang_region'),
        ),
    ]
