from django.db import models
from wagtail.models import Page
from wagtail.fields import RichTextField, StreamField
from wagtail import blocks

class HomePage(Page):
    intro = RichTextField(blank=True)
    content = StreamField([
        ("hero", blocks.StructBlock([("title", blocks.CharBlock()), ("subtitle", blocks.TextBlock(required=False))])),
        ("cards", blocks.ListBlock(blocks.StructBlock([("title", blocks.CharBlock()), ("link", blocks.URLBlock(required=False))])))
    ], blank=True, use_json_field=True)
    content_panels = Page.content_panels + []
