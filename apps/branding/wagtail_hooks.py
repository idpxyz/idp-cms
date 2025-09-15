# apps/branding/wagtail_hooks.py
from wagtail import hooks
from django.templatetags.static import static
from django.utils.html import format_html

@hooks.register("insert_global_admin_css")
def add_admin_css():
    return format_html('<link rel="stylesheet" href="{}">', static("css/cms-admin.css"))
