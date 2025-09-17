# Generated manually to address permission issues
# This migration was created based on dry-run output

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_remove_sitesettings_date_format_legacy_and_more'),
        ('news', '0008_add_topic_and_update_article'),
    ]

    operations = [
        # Change Meta options on articlepage
        migrations.AlterModelOptions(
            name='articlepage',
            options={'verbose_name': '文章页面', 'verbose_name_plural': '文章页面'},
        ),
        
        # Remove old indexes
        migrations.RemoveIndex(
            model_name='articlepage',
            name='art_pub_chan_reg_opt',
        ),
        migrations.RemoveIndex(
            model_name='articlepage',
            name='art_feat_weight_pub_opt',
        ),
        
        # Rename index on articlepagetag
        migrations.RenameIndex(
            model_name='articlepagetag',
            old_name='apt_site_idx',
            new_name='news_articl_site_id_3264a0_idx',
        ),
        
        # Remove old topic field (ForeignKey)
        migrations.RemoveField(
            model_name='articlepage',
            name='topic',
        ),
        
        # Add new topics field (ManyToManyField)
        migrations.AddField(
            model_name='articlepage',
            name='topics',
            field=models.ManyToManyField(blank=True, help_text='选择文章所属的专题（可多选）', related_name='articles', to='news.topic', verbose_name='专题'),
        ),
    ]
