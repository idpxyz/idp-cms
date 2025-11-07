# Generated manually for channel permissions feature

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('core', '0035_channeltemplate_remove_channel_channel_config_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChannelGroupPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('can_view', models.BooleanField(default=True, help_text='可以查看频道内容', verbose_name='可查看')),
                ('can_edit', models.BooleanField(default=False, help_text='可以编辑频道设置', verbose_name='可编辑')),
                ('can_publish', models.BooleanField(default=False, help_text='可以在该频道下发布文章', verbose_name='可发布文章')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('channels', models.ManyToManyField(help_text='该用户组可以访问的频道列表（留空表示可访问所有频道）', related_name='group_permissions', to='core.channel', verbose_name='可访问的频道')),
                ('group', models.ForeignKey(help_text='选择要授予频道权限的用户组', on_delete=django.db.models.deletion.CASCADE, related_name='channel_permissions', to='auth.group', verbose_name='用户组')),
            ],
            options={
                'verbose_name': '频道权限',
                'verbose_name_plural': '频道权限管理',
                'db_table': 'core_channel_group_permission',
                'ordering': ['group__name'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='channelgrouppermission',
            unique_together={('group',)},
        ),
    ]

