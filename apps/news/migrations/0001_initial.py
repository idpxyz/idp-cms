# Generated manually to resolve migration dependency issue

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ArticlePage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('introduction', models.TextField(blank=True)),
                ('body', models.TextField()),
                ('channel_slug', models.SlugField(default='recommend')),
                ('topic_slug', models.SlugField(blank=True, default='')),
                ('author_name', models.CharField(blank=True, default='', max_length=64)),
                ('has_video', models.BooleanField(default=False)),
                ('region', models.CharField(default='global', max_length=32)),
                ('language', models.CharField(default='zh', max_length=8)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
