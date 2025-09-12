# Generated manually to add external site fields

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_externalsite'),
        ('news', '0005_fix_language_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='articlepage',
            name='source_type',
            field=models.CharField(
                choices=[('internal', '内部站点'), ('external', '外部网站')],
                default='internal',
                max_length=20,
                verbose_name='来源类型',
                help_text='文章来源类型：内部站点或外部网站'
            ),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='external_site',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='external_articles',
                to='core.externalsite',
                verbose_name='外部网站',
                help_text='外部网站的来源信息'
            ),
        ),
        migrations.AddField(
            model_name='articlepage',
            name='external_article_url',
            field=models.URLField(
                blank=True,
                verbose_name='外部文章链接',
                help_text='外部网站的原始文章链接'
            ),
        ),
        migrations.AlterField(
            model_name='articlepage',
            name='source_site',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='sourced_articles',
                to='wagtailcore.site',
                verbose_name='来源站点',
                help_text='内部站点的原始来源'
            ),
        ),
    ]
