# Generated manually to resolve migration dependency issue

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='HomePage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('intro', models.TextField(blank=True)),
                ('content', models.TextField(blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
