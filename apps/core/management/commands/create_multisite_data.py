"""
创建多站点模拟数据

包含：
- 多个站点：主门户、北京、上海、深圳等
- 地区：全国、北京、上海、广东、深圳、杭州等
- 频道：热点、科技、财经、体育、娱乐、社会、国际、军事等
- 为每个站点创建对应的首页和内容结构
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Site, Page
from apps.core.models import Channel, Region
from apps.home.models import HomePage


class Command(BaseCommand):
    help = '创建多站点模拟数据，包括站点、地区、频道和页面结构'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示将要创建的数据，不实际创建',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='强制创建，覆盖现有数据',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write('=== 创建多站点模拟数据 ===')
        
        # 获取根页面
        try:
            root_page = Page.objects.get(depth=1)
            self.stdout.write(f'根页面: {root_page.title} (ID: {root_page.id})')
        except Page.DoesNotExist:
            self.stdout.write('❌ 未找到根页面，请先确保Wagtail系统正常')
            return
        
        if not dry_run and not force:
            # 检查是否已有数据
            if Site.objects.count() > 1 or Channel.objects.exists() or Region.objects.exists():
                confirm = input('\n发现现有数据，是否覆盖？(yes/no): ')
                if confirm.lower() not in ['yes', 'y']:
                    self.stdout.write('❌ 操作已取消')
                    return
        
        # 定义站点数据
        sites_data = [
            {
                'hostname': 'aivoya.com',
                'port': 80,
                'is_default': True,
                'name': 'AI新闻主门户',
                'description': '全国性综合新闻门户，提供最新AI科技资讯和综合新闻'
            },
            {
                'hostname': 'beijing.aivoya.com',
                'port': 80,
                'is_default': False,
                'name': '北京AI新闻',
                'description': '北京本地AI科技新闻和生活资讯门户'
            },
            {
                'hostname': 'shanghai.aivoya.com',
                'port': 80,
                'is_default': False,
                'name': '上海AI新闻',
                'description': '上海本地AI科技新闻和商业资讯门户'
            },
            {
                'hostname': 'shenzhen.aivoya.com',
                'port': 80,
                'is_default': False,
                'name': '深圳AI新闻',
                'description': '深圳本地AI科技新闻和创新创业资讯门户'
            },
            {
                'hostname': 'hangzhou.aivoya.com',
                'port': 80,
                'is_default': False,
                'name': '杭州AI新闻',
                'description': '杭州本地AI科技新闻和互联网资讯门户'
            }
        ]
        
        # 定义地区数据
        regions_data = [
            # 顶级地区
            {'name': '全国', 'slug': 'national', 'description': '全国范围', 'order': 1},
            {'name': '北京', 'slug': 'beijing', 'description': '首都北京', 'order': 2},
            {'name': '上海', 'slug': 'shanghai', 'description': '魔都上海', 'order': 3},
            {'name': '广东', 'slug': 'guangdong', 'description': '南粤大地', 'order': 4},
            {'name': '浙江', 'slug': 'zhejiang', 'description': '江南水乡', 'order': 5},
            {'name': '江苏', 'slug': 'jiangsu', 'description': '鱼米之乡', 'order': 6},
            {'name': '四川', 'slug': 'sichuan', 'description': '天府之国', 'order': 7},
            {'name': '湖北', 'slug': 'hubei', 'description': '荆楚大地', 'order': 8},
            {'name': '河南', 'slug': 'henan', 'description': '中原大地', 'order': 9},
            {'name': '山东', 'slug': 'shandong', 'description': '齐鲁大地', 'order': 10},
            
            # 热门城市
            {'name': '深圳', 'slug': 'shenzhen', 'description': '创新之城', 'order': 11},
            {'name': '杭州', 'slug': 'hangzhou', 'description': '互联网之都', 'order': 12},
            {'name': '成都', 'slug': 'chengdu', 'description': '休闲之都', 'order': 13},
            {'name': '西安', 'slug': 'xian', 'description': '古都长安', 'order': 14},
            {'name': '重庆', 'slug': 'chongqing', 'description': '山城重庆', 'order': 15},
            {'name': '武汉', 'slug': 'wuhan', 'description': '江城武汉', 'order': 16},
            {'name': '南京', 'slug': 'nanjing', 'description': '六朝古都', 'order': 17},
            {'name': '天津', 'slug': 'tianjin', 'description': '津门故里', 'order': 18},
            {'name': '青岛', 'slug': 'qingdao', 'description': '海滨城市', 'order': 19},
            {'name': '大连', 'slug': 'dalian', 'description': '浪漫之都', 'order': 20},
        ]
        
        # 定义频道数据
        channels_data = [
            # 核心频道
            {'name': '热点', 'slug': 'hot', 'description': '实时热点新闻', 'order': 1},
            {'name': '推荐', 'slug': 'recommend', 'description': '个性化推荐内容', 'order': 2},
            {'name': '关注', 'slug': 'follow', 'description': '关注的人和话题', 'order': 3},
            
            # 新闻频道
            {'name': '社会', 'slug': 'society', 'description': '社会民生新闻', 'order': 4},
            {'name': '国际', 'slug': 'international', 'description': '国际新闻动态', 'order': 5},
            {'name': '军事', 'slug': 'military', 'description': '军事国防新闻', 'order': 6},
            {'name': '政治', 'slug': 'politics', 'description': '政治新闻', 'order': 7},
            
            # 专业频道
            {'name': '科技', 'slug': 'tech', 'description': '科技前沿资讯', 'order': 8},
            {'name': '财经', 'slug': 'finance', 'description': '财经金融资讯', 'order': 9},
            {'name': '体育', 'slug': 'sports', 'description': '体育赛事新闻', 'order': 10},
            {'name': '娱乐', 'slug': 'entertainment', 'description': '娱乐圈动态', 'order': 11},
            {'name': '汽车', 'slug': 'auto', 'description': '汽车行业资讯', 'order': 12},
            {'name': '房产', 'slug': 'realestate', 'description': '房地产资讯', 'order': 13},
            
            # 生活频道
            {'name': '健康', 'slug': 'health', 'description': '健康养生资讯', 'order': 14},
            {'name': '教育', 'slug': 'education', 'description': '教育行业资讯', 'order': 15},
            {'name': '旅游', 'slug': 'travel', 'description': '旅游攻略资讯', 'order': 16},
            {'name': '美食', 'slug': 'food', 'description': '美食文化资讯', 'order': 17},
            {'name': '时尚', 'slug': 'fashion', 'description': '时尚潮流资讯', 'order': 18},
            {'name': '母婴', 'slug': 'parenting', 'description': '育儿母婴资讯', 'order': 19},
            
            # 垂直频道
            {'name': '游戏', 'slug': 'gaming', 'description': '游戏行业资讯', 'order': 20},
            {'name': '动漫', 'slug': 'anime', 'description': '动漫二次元资讯', 'order': 21},
            {'name': '电影', 'slug': 'movie', 'description': '电影资讯', 'order': 22},
            {'name': '电视剧', 'slug': 'tv', 'description': '电视剧资讯', 'order': 23},
            {'name': '音乐', 'slug': 'music', 'description': '音乐资讯', 'order': 24},
            {'name': '文学', 'slug': 'literature', 'description': '文学创作资讯', 'order': 25},
        ]
        
        if dry_run:
            self.stdout.write('\n🔍 预览模式 - 将创建以下数据：')
            
            self.stdout.write('\n=== 站点数据 ===')
            for site in sites_data:
                self.stdout.write(f'  - {site["hostname"]} - {site["name"]}')
            
            self.stdout.write('\n=== 地区数据 ===')
            for region in regions_data:
                self.stdout.write(f'  - {region["name"]} ({region["slug"]}) - {region["description"]}')
            
            self.stdout.write('\n=== 频道数据 ===')
            for channel in channels_data:
                self.stdout.write(f'  - {channel["name"]} ({channel["slug"]}) - {channel["description"]}')
            
            return
        
        # 执行创建
        try:
            with transaction.atomic():
                self.stdout.write('\\n开始创建多站点数据...')
                
                # 第一步：清理现有数据（如果强制模式）
                if force:
                    self.stdout.write('\\n=== 清理现有数据 ===')
                    # 只清理 Snippets 数据，保留页面结构
                    # 先清理关联关系，再删除对象
                    for channel in Channel.objects.all():
                        channel.sites.clear()
                    Channel.objects.all().delete()
                    
                    for region in Region.objects.all():
                        region.sites.clear()
                    Region.objects.all().delete()
                    
                    self.stdout.write('已清理现有频道和地区数据')
                
                # 第二步：获取现有站点或创建新站点
                self.stdout.write('\\n=== 配置站点 ===')
                
                # 获取默认站点
                try:
                    default_site = Site.objects.get(is_default_site=True)
                    self.stdout.write(f'找到默认站点: {default_site.hostname}')
                except Site.DoesNotExist:
                    # 创建默认站点
                    default_site = Site.objects.create(
                        hostname='localhost',
                        port=8000,
                        is_default_site=True,
                        root_page=root_page
                    )
                    self.stdout.write(f'创建默认站点: {default_site.hostname}')
                
                # 创建/更新站点配置
                created_sites = {}
                
                # 处理主门户站点
                main_site_data = sites_data[0]  # aivoya.com
                try:
                    main_site = Site.objects.get(hostname=main_site_data['hostname'])
                    self.stdout.write(f'找到主站点: {main_site.hostname}')
                except Site.DoesNotExist:
                    main_site = Site.objects.create(
                        hostname=main_site_data['hostname'],
                        port=main_site_data['port'],
                        is_default_site=False,  # 保持localhost为默认
                        root_page=root_page
                    )
                    self.stdout.write(f'创建主站点: {main_site.hostname}')
                
                created_sites[main_site.hostname] = main_site
                
                # 处理地区子站点
                for site_data in sites_data[1:]:
                    try:
                        site = Site.objects.get(hostname=site_data['hostname'])
                        self.stdout.write(f'找到地区站点: {site.hostname}')
                    except Site.DoesNotExist:
                        site = Site.objects.create(
                            hostname=site_data['hostname'],
                            port=site_data['port'],
                            is_default_site=False,
                            root_page=root_page
                        )
                        self.stdout.write(f'创建地区站点: {site.hostname}')
                    
                    created_sites[site.hostname] = site
                
                # 第三步：创建地区数据
                self.stdout.write('\\n=== 创建地区数据 ===')
                created_regions = {}
                for region_data in regions_data:
                    region = Region.objects.create(
                        name=region_data['name'],
                        slug=region_data['slug'],
                        description=region_data['description'],
                        order=region_data['order'],
                        is_active=True
                    )
                    # 关联到所有站点
                    for site in created_sites.values():
                        region.sites.add(site)
                    created_regions[region.slug] = region
                    self.stdout.write(f'  已创建地区: {region.name}')
                
                # 第四步：创建频道数据
                self.stdout.write('\\n=== 创建频道数据 ===')
                created_channels = {}
                for channel_data in channels_data:
                    channel = Channel.objects.create(
                        name=channel_data['name'],
                        slug=channel_data['slug'],
                        description=channel_data['description'],
                        order=channel_data['order'],
                        is_active=True
                    )
                    # 关联到所有站点
                    for site in created_sites.values():
                        channel.sites.add(site)
                    created_channels[channel.slug] = channel
                    self.stdout.write(f'  已创建频道: {channel.name}')
                
                # 第五步：为每个站点创建或更新首页
                self.stdout.write('\\n=== 配置站点首页 ===')
                created_homepages = {}
                
                for hostname, site in created_sites.items():
                    # 检查站点是否已有首页
                    if site.root_page.depth > 1:
                        # 站点已有首页，跳过
                        self.stdout.write(f'  站点 {hostname} 已有首页: {site.root_page.title}')
                        created_homepages[hostname] = site.root_page
                        continue
                    
                    # 为站点创建新首页
                    if hostname == 'aivoya.com':
                        homepage_title = 'AI新闻主门户'
                        homepage_intro = '全国性综合新闻门户，提供最新AI科技资讯和综合新闻'
                        homepage_content = '欢迎来到AI新闻主门户，这里是您获取最新AI科技资讯和综合新闻的首选平台。'
                    else:
                        region_name = hostname.split('.')[0].title()
                        homepage_title = f'{region_name}AI新闻'
                        homepage_intro = f'{region_name}本地AI科技新闻和生活资讯门户'
                        homepage_content = f'欢迎来到{region_name}AI新闻，这里是您获取{region_name}本地AI科技新闻和生活资讯的首选平台。'
                    
                    # 创建首页
                    homepage = HomePage(
                        title=homepage_title,
                        slug=hostname.replace('.', '-').replace(':', '-'),
                        intro=homepage_intro,
                        content=homepage_content
                    )
                    
                    # 将首页添加到根页面下
                    root_page.add_child(instance=homepage)
                    homepage.save()
                    
                    # 更新站点根页面
                    site.root_page = homepage
                    site.save()
                    
                    created_homepages[hostname] = homepage
                    self.stdout.write(f'  已创建首页: {homepage.title} -> {hostname}')
                
                self.stdout.write(f'\n=== 创建完成 ===')
                self.stdout.write(f'成功创建站点: {len(created_sites)} 个')
                self.stdout.write(f'成功创建地区: {len(created_regions)} 个')
                self.stdout.write(f'成功创建频道: {len(created_channels)} 个')
                
                # 显示创建的数据
                self.stdout.write(f'\n=== 站点列表 ===')
                for hostname, site in created_sites.items():
                    self.stdout.write(f'  - {hostname} -> {site.root_page.title}')
                
                self.stdout.write(f'\n=== 地区列表 ===')
                for slug, region in created_regions.items():
                    self.stdout.write(f'  {region.order:2d}. {region.name} ({slug})')
                
                self.stdout.write(f'\n=== 频道列表 ===')
                for slug, channel in created_channels.items():
                    self.stdout.write(f'  {channel.order:2d}. {channel.name} ({slug})')
                
        except Exception as e:
            self.stdout.write(f'❌ 创建过程中出错: {e}')
            return
        
        self.stdout.write(self.style.SUCCESS('\n🎉 多站点模拟数据创建完成！'))
        self.stdout.write('\n现在您可以：')
        self.stdout.write('1. 访问 http://localhost:8000/admin/ 查看Snippets和Pages')
        self.stdout.write('2. 在Snippets中管理频道和地区')
        self.stdout.write('3. 在Pages中查看多站点结构')
        self.stdout.write('4. 创建文章时选择对应的频道和地区')
