# Generated manually to convert localization fields to ForeignKeys

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_convert_theme_font_to_foreign_keys'),
    ]

    operations = [
        # First, rename existing fields to preserve data
        migrations.RenameField(
            model_name='sitesettings',
            old_name='default_language',
            new_name='default_language_legacy',
        ),
        migrations.RenameField(
            model_name='sitesettings',
            old_name='timezone',
            new_name='timezone_legacy',
        ),
        migrations.RenameField(
            model_name='sitesettings',
            old_name='date_format',
            new_name='date_format_legacy',
        ),
        
        # Add new ForeignKey fields
        migrations.AddField(
            model_name='sitesettings',
            name='default_language',
            field=models.ForeignKey(
                blank=True,
                help_text='网站的主要语言，用于内容显示和SEO',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='default_sites',
                to='core.language',
                verbose_name='默认语言'
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='timezone',
            field=models.ForeignKey(
                blank=True,
                help_text='网站使用的时区，影响时间显示',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='core.timezone',
                verbose_name='时区'
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='date_format',
            field=models.ForeignKey(
                blank=True,
                help_text='日期显示格式，如：2023-12-25',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='core.dateformat',
                verbose_name='日期格式'
            ),
        ),
        
        # Update supported_languages field to add related_name
        migrations.AlterField(
            model_name='sitesettings',
            name='supported_languages',
            field=models.ManyToManyField(
                blank=True,
                help_text='网站支持的所有语言，影响多语言功能',
                related_name='supported_sites',
                to='core.language',
                verbose_name='支持的语言'
            ),
        ),
        
        # Note: Manual data migration needed to map legacy values to new records
        # The legacy fields can be removed in a future migration after data migration
    ]
