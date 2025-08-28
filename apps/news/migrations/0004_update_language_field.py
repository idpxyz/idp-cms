# Generated manually to handle language field conversion

from django.db import migrations, models
import django.db.models.deletion


def convert_language_codes_to_ids(apps, schema_editor):
    """
    将现有的语言代码字符串转换为对应的Language模型ID
    """
    ArticlePage = apps.get_model('news', 'ArticlePage')
    Language = apps.get_model('core', 'Language')
    
    # 获取语言映射
    language_mapping = {}
    for lang in Language.objects.all():
        language_mapping[lang.code] = lang.id
    
    # 更新所有文章的语言字段
    for article in ArticlePage.objects.all():
        if hasattr(article, 'language') and article.language:
            # 如果language字段是字符串，转换为对应的ID
            if isinstance(article.language, str):
                lang_id = language_mapping.get(article.language)
                if lang_id:
                    article.language_id = lang_id
                    article.save(update_fields=['language_id'])


def reverse_convert_language_ids_to_codes(apps, schema_editor):
    """
    反向转换：将Language模型ID转换回语言代码字符串
    """
    ArticlePage = apps.get_model('news', 'ArticlePage')
    Language = apps.get_model('core', 'Language')
    
    # 获取语言映射
    language_mapping = {}
    for lang in Language.objects.all():
        language_mapping[lang.id] = lang.code
    
    # 更新所有文章的语言字段
    for article in ArticlePage.objects.all():
        if hasattr(article, 'language_id') and article.language_id:
            lang_code = language_mapping.get(article.language_id)
            if lang_code:
                article.language = lang_code
                article.save(update_fields=['language'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_add_cdn_models'),
        ('news', '0003_add_optimization_indexes'),
    ]

    operations = [
        # 第一步：添加新的language_id字段
        migrations.AddField(
            model_name='articlepage',
            name='language_id',
            field=models.BigIntegerField(blank=True, null=True, verbose_name='语言'),
        ),
        
        # 第二步：运行数据迁移
        migrations.RunPython(
            convert_language_codes_to_ids,
            reverse_convert_language_ids_to_codes,
        ),
        
        # 第三步：删除旧的language字段
        migrations.RemoveField(
            model_name='articlepage',
            name='language',
        ),
        
        # 第四步：重命名新字段
        migrations.RenameField(
            model_name='articlepage',
            old_name='language_id',
            new_name='language',
        ),
        
        # 第五步：设置外键关系
        migrations.AlterField(
            model_name='articlepage',
            name='language',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='core.language',
                verbose_name='语言',
                help_text='文章的语言'
            ),
        ),
    ]
