import os, django, time
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()
from apps.news.models.article import ArticlePage, ArticlePageForm
from wagtail.models import Site
from apps.core.models import Category, Channel
from apps.news.models.topic import Topic

print('🧪 start test...')
site = Site.objects.get(is_default_site=True)
home = site.root_page.get_children().live().first() or site.root_page

channel = Channel.objects.filter(sites=site).first()
if not channel:
    channel = Channel.objects.create(name='测试频道', slug=f'test-ch-{int(time.time())}')
    channel.sites.add(site)

category = Category.objects.filter(sites=site).first()
if not category:
    category = Category.objects.create(name='测试分类', slug=f'test-cat-{int(time.time())}')
    category.sites.add(site)

topic = Topic.objects.first() or Topic.objects.create(title='测试专题', slug=f'test-topic-{int(time.time())}')

slug = f'test-article-{int(time.time())}'
page = ArticlePage(
    title=f'创建测试 {slug}',
    slug=slug,
    excerpt='测试摘要',
    body='<p>正文</p>',
    channel=channel,
)
form_data = {
    'title': page.title,
    'slug': page.slug,
    'excerpt': page.excerpt,
    'body': page.body,
    'channel': channel.id,
    'categories': [category.id],
    'topics': [topic.id],
}
form = ArticlePageForm(data=form_data, instance=page, parent_page=home)
print('is_valid:', form.is_valid())
if not form.is_valid():
    print('errors:', dict(form.errors))
    raise SystemExit(1)
instance = form.save(commit=False)
home.add_child(instance=instance)
form.save_m2m()
print('OK categories:', instance.categories.count(), 'topics:', instance.topics.count())
instance.delete()
print('✅ done')
