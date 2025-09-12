from django.core.management.base import BaseCommand
from wagtail.models import Site
from apps.news.models import ArticlePage


class Command(BaseCommand):
    help = "简化版数据一致性检查"

    def handle(self, *args, **options):
        self.stdout.write("🔍 开始数据一致性检查...")
        
        # 检查Wagtail站点配置
        self.stdout.write("\n=== Wagtail站点配置检查 ===")
        
        sites = Site.objects.all()
        root_pages = {}
        
        for site in sites:
            root_id = site.root_page_id
            article_count = ArticlePage.objects.live().descendant_of(site.root_page).count()
            
            self.stdout.write(f"📍 站点: {site.hostname}")
            self.stdout.write(f"   - ID: {site.id}")
            self.stdout.write(f"   - 根页面ID: {root_id}")
            self.stdout.write(f"   - 文章数量: {article_count}")
            
            if root_id in root_pages:
                self.stdout.write(self.style.ERROR(f"❌ 与站点 {root_pages[root_id]} 共享根页面！"))
            else:
                root_pages[root_id] = site.hostname
                self.stdout.write("✅ 根页面配置正常")
            
            self.stdout.write("")
        
        self.stdout.write("✅ 检查完成！")
