from celery import shared_task
from wagtail.models import Page
from apps.news.models.article import ArticlePage
from .client import get_client, index_name_for
from .indexer import article_to_doc

@shared_task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def upsert_article_doc(page_id:int):
    page = Page.objects.filter(id=page_id).specific().first()
    if not page or not page.live: return
    idx = index_name_for(page.get_site().hostname)
    get_client().index(index=idx, id=str(page.id), body=article_to_doc(page))

@shared_task
def delete_article_doc(page_id:int):
    try:
        # Use SITE_HOSTNAME alias to try delete; for multi-tenant you may loop indices.
        from django.conf import settings
        get_client().delete(index=index_name_for(settings.SITE_HOSTNAME), id=str(page_id))
    except Exception:
        pass
