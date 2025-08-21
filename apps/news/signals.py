from django.dispatch import receiver
from wagtail.signals import page_published, page_unpublished
from django.db.models.signals import post_save
from django.db import transaction
from .models.article import ArticlePage
from apps.searchapp.tasks import upsert_article_doc, delete_article_doc

@receiver(page_published)
def on_publish(sender, **kwargs):
    page = kwargs.get("instance")
    if isinstance(page, ArticlePage):
        upsert_article_doc.delay(page.id)

@receiver(page_unpublished)
def on_unpublish(sender, **kwargs):
    page = kwargs.get("instance")
    if isinstance(page, ArticlePage):
        delete_article_doc.delay(page.id)

@receiver(post_save, sender=ArticlePage)
def on_article_save(sender, instance, created, **kwargs):
    """
    使用Django的post_save信号来监听文章保存
    确保在文章保存后能够触发索引更新
    """
    # 只有在文章已发布时才更新索引
    if instance.live:
        # 使用事务提交后的回调来确保数据已保存
        transaction.on_commit(lambda: upsert_article_doc.delay(instance.id))
