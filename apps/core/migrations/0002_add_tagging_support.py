# Generated manually to add tagging support

from django.db import migrations, models
import django.db.models.deletion
import modelcluster.fields
import taggit.managers


class Migration(migrations.Migration):

    dependencies = [
        ('taggit', '0006_rename_taggeditem_content_type_object_id_taggit_tagg_content_8fc721_idx'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChannelTaggedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.IntegerField(db_index=True, verbose_name='object ID')),
                ('content_object', modelcluster.fields.ParentalKey(on_delete=django.db.models.deletion.CASCADE, related_name='tagged_items', to='core.channel')),
                ('tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(app_label)s_%(class)s_items', to='taggit.tag')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='RegionTaggedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.IntegerField(db_index=True, verbose_name='object ID')),
                ('content_object', modelcluster.fields.ParentalKey(on_delete=django.db.models.deletion.CASCADE, related_name='tagged_items', to='core.region')),
                ('tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(app_label)s_%(class)s_items', to='taggit.tag')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='channel',
            name='tags',
            field=taggit.managers.TaggableManager(blank=True, help_text='为频道添加标签，便于分类和搜索', through='core.ChannelTaggedItem', to='taggit.tag', verbose_name='标签'),
        ),
        migrations.AddField(
            model_name='region',
            name='tags',
            field=taggit.managers.TaggableManager(blank=True, help_text='为地区添加标签，便于分类和搜索', through='core.RegionTaggedItem', to='taggit.tag', verbose_name='标签'),
        ),
    ]
