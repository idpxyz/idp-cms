"""
创建今日头条风格的模拟数据

包含：
- 地区：全国、北京、上海、广东、深圳、杭州等
- 频道：热点、科技、财经、体育、娱乐、社会、国际、军事等
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Site
from apps.core.models import Channel, Region


class Command(BaseCommand):
    help = '创建今日头条风格的模拟地区和频道数据'

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
        
        self.stdout.write('=== 创建今日头条风格模拟数据 ===')
        
        # 获取默认站点
        try:
            default_site = Site.objects.get(hostname='localhost')
            self.stdout.write(f'使用站点: {default_site.hostname}')
        except Site.DoesNotExist:
            self.stdout.write('⚠️  未找到localhost站点，将创建新站点')
            default_site = Site.objects.create(
                hostname='localhost',
                port=8000,
                is_default_site=True,
                root_page_id=1
            )
        
        if not dry_run and not force:
            # 检查是否已有数据
            if Channel.objects.exists() or Region.objects.exists():
                confirm = input('\n发现现有数据，是否覆盖？(yes/no): ')
                if confirm.lower() not in ['yes', 'y']:
                    self.stdout.write('❌ 操作已取消')
                    return
        
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
                # 清理现有数据（如果强制模式）
                if force:
                    Channel.objects.all().delete()
                    Region.objects.all().delete()
                    self.stdout.write('已清理现有数据')
                
                # 创建地区
                created_regions = {}
                for region_data in regions_data:
                    region = Region.objects.create(
                        name=region_data['name'],
                        slug=region_data['slug'],
                        description=region_data['description'],
                        order=region_data['order'],
                        is_active=True
                    )
                    region.sites.add(default_site)
                    created_regions[region.slug] = region
                    self.stdout.write(f'  已创建地区: {region.name}')
                
                # 创建频道
                created_channels = {}
                for channel_data in channels_data:
                    channel = Channel.objects.create(
                        name=channel_data['name'],
                        slug=channel_data['slug'],
                        description=channel_data['description'],
                        order=channel_data['order'],
                        is_active=True
                    )
                    channel.sites.add(default_site)
                    created_channels[channel.slug] = channel
                    self.stdout.write(f'  已创建频道: {channel.name}')
                
                self.stdout.write(f'\n=== 创建完成 ===')
                self.stdout.write(f'成功创建地区: {len(created_regions)} 个')
                self.stdout.write(f'成功创建频道: {len(created_channels)} 个')
                
                # 显示创建的数据
                self.stdout.write(f'\n=== 地区列表 ===')
                for slug, region in created_regions.items():
                    self.stdout.write(f'  {region.order:2d}. {region.name} ({slug})')
                
                self.stdout.write(f'\n=== 频道列表 ===')
                for slug, channel in created_channels.items():
                    self.stdout.write(f'  {channel.order:2d}. {channel.name} ({slug})')
                
        except Exception as e:
            self.stdout.write(f'❌ 创建过程中出错: {e}')
            return
        
        self.stdout.write(self.style.SUCCESS('\n🎉 今日头条风格数据创建完成！'))
        self.stdout.write('\n现在您可以：')
        self.stdout.write('1. 访问 http://localhost:8000/admin/ 查看Snippets')
        self.stdout.write('2. 在Snippets中管理频道和地区')
        self.stdout.write('3. 创建文章时选择对应的频道和地区')
