from django.db import migrations


def drop_table(apps, schema_editor):
    # 直接删除遗留表（如果存在）
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'core_collectionextension'
                ) THEN
                    DROP TABLE core_collectionextension CASCADE;
                END IF;
            END$$;
        """)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0026_add_collection_extension'),
    ]

    operations = [
        migrations.RunPython(drop_table, reverse_code=migrations.RunPython.noop),
    ]


