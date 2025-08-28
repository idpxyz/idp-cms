# Generated manually for CDN models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('wagtailcore', '0095_groupsitepermission'),
        ('core', '0010_alter_customconfigitem_config_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='CDNProvider',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='CDN名称')),
                ('provider_type', models.CharField(choices=[('aliyun', '阿里云CDN'), ('tencent', '腾讯云CDN'), ('baidu', '百度云CDN'), ('cloudflare', 'Cloudflare'), ('aws', 'AWS CloudFront'), ('azure', 'Azure CDN'), ('custom', '自定义CDN')], max_length=50, verbose_name='CDN类型')),
                ('api_key', models.CharField(max_length=255, verbose_name='API密钥')),
                ('api_secret', models.CharField(max_length=255, verbose_name='API密钥')),
                ('endpoint_url', models.URLField(verbose_name='API端点')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': 'CDN服务提供商',
                'verbose_name_plural': 'CDN服务提供商',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='SiteCDNConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cdn_domain', models.CharField(max_length=255, verbose_name='CDN域名')),
                ('cdn_ssl_enabled', models.BooleanField(default=True, verbose_name='启用HTTPS')),
                ('cache_strategy', models.CharField(choices=[('aggressive', '激进缓存'), ('balanced', '平衡缓存'), ('conservative', '保守缓存')], default='balanced', max_length=50, verbose_name='缓存策略')),
                ('custom_config', models.JSONField(default=dict, verbose_name='自定义配置')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('last_cache_purge', models.DateTimeField(blank=True, null=True, verbose_name='最后缓存清除时间')),
                ('cache_hit_rate', models.FloatField(default=0.0, verbose_name='缓存命中率')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('cdn_provider', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.cdnprovider', verbose_name='CDN服务提供商')),
                ('regions', models.ManyToManyField(blank=True, to='core.region', verbose_name='服务地区')),
                ('site', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='wagtailcore.site', verbose_name='站点')),
            ],
            options={
                'verbose_name': '站点CDN配置',
                'verbose_name_plural': '站点CDN配置',
            },
        ),
    ]
