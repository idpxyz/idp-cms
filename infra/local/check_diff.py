from wagtail.models import Site
from apps.news.models import ArticlePage

print('🔍 发现问题根源:')
print('=' * 50)

# 1. aivoya.com 站点文章
site = Site.objects.get(hostname='aivoya.com')
db_articles = ArticlePage.objects.live().descendant_of(site.root_page)
db_count = db_articles.count()
print(f'📊 aivoya.com 站点文章: {db_count}')

# 2. 全部文章 (索引器实际处理的)
all_articles = ArticlePage.objects.live().public()
all_count = all_articles.count()
print(f'📊 全部站点文章: {all_count}')
print(f'🔍 差异: {all_count - db_count} 篇')

# 3. 各站点分布
print()
print('📊 各站点文章分布:')
sites = Site.objects.all()
for s in sites:
    try:
        site_articles = ArticlePage.objects.live().descendant_of(s.root_page)
        count = site_articles.count()
        print(f'   {s.hostname}: {count} 篇')
    except Exception:
        print(f'   {s.hostname}: 查询错误')
