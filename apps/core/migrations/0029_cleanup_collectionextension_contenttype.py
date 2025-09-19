from django.db import migrations


def cleanup_content_type(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='core', model='collectionextension').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0028_delete_collectionextension'),
        ('contenttypes', '__latest__'),
    ]

    operations = [
        migrations.RunPython(cleanup_content_type, reverse_code=migrations.RunPython.noop),
    ]


