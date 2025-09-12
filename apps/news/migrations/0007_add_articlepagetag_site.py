# Generated to add site field to ArticlePageTag and create index

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('wagtailcore', '0095_groupsitepermission'),
        ('news', '0006_add_external_site_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='articlepagetag',
            name='site',
            field=models.ForeignKey(
                to='wagtailcore.site',
                on_delete=django.db.models.deletion.CASCADE,
                null=True,
                blank=True,
            ),
        ),
        migrations.AddIndex(
            model_name='articlepagetag',
            index=models.Index(fields=['site'], name='apt_site_idx'),
        ),
    ]


