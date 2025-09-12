# 为 Wagtail Site 模型添加 slug 字段

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_auto_20250902_2231'),
        ('wagtailcore', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            "ALTER TABLE wagtailcore_site ADD COLUMN slug VARCHAR(50) UNIQUE;",
            reverse_sql="ALTER TABLE wagtailcore_site DROP COLUMN slug;"
        ),
    ]
