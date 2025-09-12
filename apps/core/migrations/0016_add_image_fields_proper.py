# Generated manually to add image fields for proper logo management

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('wagtailimages', '0025_alter_image_file_alter_rendition_file'),
        ('core', '0015_refactor_models_to_directory'),
    ]

    operations = [
        # Add brand logo image field
        migrations.AddField(
            model_name='sitesettings',
            name='brand_logo_image',
            field=models.ForeignKey(
                blank=True, 
                help_text='推荐尺寸：200x60px，支持PNG/SVG格式', 
                null=True, 
                on_delete=django.db.models.deletion.SET_NULL, 
                related_name='+', 
                to='wagtailimages.image', 
                verbose_name='品牌Logo图片'
            ),
        ),
        
        # Add site logo image field
        migrations.AddField(
            model_name='sitesettings',
            name='site_logo_image',
            field=models.ForeignKey(
                blank=True, 
                help_text='推荐尺寸：150x40px，支持PNG/SVG格式', 
                null=True, 
                on_delete=django.db.models.deletion.SET_NULL, 
                related_name='+', 
                to='wagtailimages.image', 
                verbose_name='站点Logo图片'
            ),
        ),
        
        # Add favicon image field
        migrations.AddField(
            model_name='sitesettings',
            name='favicon_image',
            field=models.ForeignKey(
                blank=True, 
                help_text='推荐尺寸：32x32px或16x16px，ICO/PNG格式', 
                null=True, 
                on_delete=django.db.models.deletion.SET_NULL, 
                related_name='+', 
                to='wagtailimages.image', 
                verbose_name='网站图标图片'
            ),
        ),
        
        # Update help text for existing URL fields
        migrations.AlterField(
            model_name='sitesettings',
            name='brand_logo',
            field=models.URLField(blank=True, help_text='当未上传图片时使用，或作为外部图片链接', verbose_name='品牌Logo URL'),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='logo_url',
            field=models.URLField(blank=True, help_text='当未上传图片时使用，或作为外部图片链接', verbose_name='站点Logo URL'),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='favicon_url',
            field=models.URLField(blank=True, help_text='当未上传图片时使用，或作为外部图片链接', verbose_name='网站图标URL'),
        ),
    ]
