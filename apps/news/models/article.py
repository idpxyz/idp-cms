from django.db import models
from wagtail.fields import RichTextField
from wagtail.models import Page
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager

class ArticlePageTag(TaggedItemBase):
    content_object = ParentalKey('ArticlePage', related_name='tagged_items', on_delete=models.CASCADE)

class ArticlePage(Page):
    introduction = models.TextField(blank=True)
    body = RichTextField(features=["bold","italic","link","image"])
    channel_slug = models.SlugField(default="recommend")
    topic_slug = models.SlugField(blank=True, default="")
    author_name = models.CharField(max_length=64, blank=True, default="")
    has_video = models.BooleanField(default=False)
    region = models.CharField(max_length=32, default="global")
    language = models.CharField(max_length=8, default="zh")
    tags = TaggableManager(through=ArticlePageTag, blank=True)
    content_panels = Page.content_panels + []
