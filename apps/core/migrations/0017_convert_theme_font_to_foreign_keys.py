# Generated manually to convert theme and font fields to ForeignKeys

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_add_image_fields_proper'),
    ]

    operations = [
        # First, rename existing fields to preserve data
        migrations.RenameField(
            model_name='sitesettings',
            old_name='theme',
            new_name='theme_legacy',
        ),
        migrations.RenameField(
            model_name='sitesettings',
            old_name='font_family',
            new_name='font_family_legacy',
        ),
        
        # Add new ForeignKey fields
        migrations.AddField(
            model_name='sitesettings',
            name='theme',
            field=models.ForeignKey(
                blank=True,
                help_text='选择预设的UI主题样式',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='core.theme',
                verbose_name='主题'
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='font_family',
            field=models.ForeignKey(
                blank=True,
                help_text='选择预设的字体样式',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='core.font',
                verbose_name='字体'
            ),
        ),
        
        # Note: Manual data migration needed to map legacy values to new records
        # The legacy fields can be removed in a future migration after data migration
    ]
