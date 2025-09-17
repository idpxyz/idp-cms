# Rollback migration to remove Tag model and return to django-taggit

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_remove_sitesettings_date_format_legacy_and_more'),
    ]

    operations = [
        # Remove indexes for Tag model
        migrations.RemoveIndex(
            model_name='tag',
            name='core_tag_categor_98eb4b_idx',
        ),
        migrations.RemoveIndex(
            model_name='tag',
            name='core_tag_is_acti_955787_idx',
        ),
        migrations.RemoveIndex(
            model_name='tag',
            name='core_tag_slug_4ab57c_idx',
        ),
        
        # Remove Tag model
        migrations.DeleteModel(
            name='Tag',
        ),
    ]
