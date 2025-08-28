from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.conf import settings
import json

try:
    from apps.core.models import SiteSettings
    from wagtail.models import Site
    CONFIG_SYSTEM_AVAILABLE = True
except ImportError:
    CONFIG_SYSTEM_AVAILABLE = False


class Command(BaseCommand):
    help = """
    显示站点配置预览信息
    
    用法:
        python manage.py site_config_preview                    # 预览所有站点配置
        python manage.py site_config_preview --site localhost  # 预览特定站点配置
        python manage.py site_config_preview --format json     # JSON格式输出
        python manage.py site_config_preview --detailed        # 详细配置信息
    """
    
    def add_arguments(self, parser):
        parser.add_argument('--site', help='站点ID (hostname)')
        parser.add_argument('--format', choices=['table', 'json', 'detailed'], default='table',
                          help='输出格式')
        parser.add_argument('--detailed', action='store_true', help='显示详细配置信息')
    
    def handle(self, *args, **options):
        if not CONFIG_SYSTEM_AVAILABLE:
            raise CommandError("配置系统不可用，请检查应用配置")
        
        site_id = options.get('site')
        output_format = options.get('format')
        detailed = options.get('detailed') or output_format == 'detailed'
        
        if site_id:
            # 预览单个站点
            self.preview_single_site(site_id, output_format, detailed)
        else:
            # 预览所有站点
            self.preview_all_sites(output_format, detailed)
    
    def preview_single_site(self, site_id, output_format, detailed):
        """预览单个站点配置"""
        try:
            site = Site.objects.get(hostname=site_id)
            settings = SiteSettings.get_for_site(site)
            
            if output_format == 'json':
                self.output_json(settings, detailed)
            else:
                self.output_detailed_table(settings) if detailed else self.output_summary_table(settings)
                
        except Site.DoesNotExist:
            raise CommandError(f"站点 {site_id} 不存在")
        except Exception as e:
            raise CommandError(f"预览配置失败: {e}")
    
    def preview_all_sites(self, output_format, detailed):
        """预览所有站点配置"""
        try:
            sites = Site.objects.all()
            
            if output_format == 'json':
                all_configs = {}
                for site in sites:
                    settings = SiteSettings.get_for_site(site)
                    all_configs[site.hostname] = self.get_config_data(settings, detailed)
                self.stdout.write(json.dumps(all_configs, indent=2, ensure_ascii=False))
            else:
                self.output_all_sites_table(sites, detailed)
                
        except Exception as e:
            raise CommandError(f"预览所有配置失败: {e}")
    
    def output_summary_table(self, settings):
        """输出配置摘要表格"""
        summary = settings.config_summary
        status = settings.config_status
        
        self.stdout.write(f"\n🎯 站点配置预览: {settings.site.site_name}")
        self.stdout.write("=" * 60)
        
        # 站点信息
        self.stdout.write(f"📍 站点: {summary['site_info']['hostname']}")
        self.stdout.write(f"🏷️  名称: {summary['site_info']['site_name']}")
        self.stdout.write(f"🌍 环境: {'生产环境' if summary['site_info']['is_production'] else '开发环境'}")
        
        # 配置状态
        self.stdout.write(f"\n📊 配置状态: {status['score']}/100")
        if status['warnings']:
            self.stdout.write(self.style.WARNING(f"⚠️  警告: {len(status['warnings'])} 项"))
        if status['errors']:
            self.stdout.write(self.style.ERROR(f"❌ 错误: {len(status['errors'])} 项"))
        
        # 功能开关
        features = summary['features']
        enabled_features = [k for k, v in features.items() if v]
        disabled_features = [k for k, v in features.items() if not v]
        
        self.stdout.write(f"\n✅ 已启用功能: {', '.join(enabled_features)}")
        self.stdout.write(f"❌ 已禁用功能: {', '.join(disabled_features)}")
        
        # UI配置
        ui = summary['ui']
        self.stdout.write(f"\n🎨 UI配置:")
        self.stdout.write(f"   主题: {ui['theme']}")
        self.stdout.write(f"   主色调: {ui['primary_color']}")
        self.stdout.write(f"   深色模式: {'启用' if ui['dark_mode'] else '禁用'}")
        
        # 性能配置
        perf = summary['performance']
        self.stdout.write(f"\n⚡ 性能配置:")
        self.stdout.write(f"   缓存时间: {perf['cache_timeout']}")
        self.stdout.write(f"   每页文章数: {perf['max_articles_per_page']}")
        self.stdout.write(f"   CDN: {'启用' if perf['cdn_enabled'] else '禁用'}")
    
    def output_detailed_table(self, settings):
        """输出详细配置表格"""
        self.output_summary_table(settings)
        
        self.stdout.write(f"\n🔍 详细配置信息:")
        self.stdout.write("=" * 60)
        
        # 品牌配置
        self.stdout.write(f"\n🏢 品牌配置:")
        self.stdout.write(f"   品牌名称: {settings.brand_name or '未设置'}")
        self.stdout.write(f"   品牌Logo: {settings.brand_logo or '未设置'}")
        self.stdout.write(f"   品牌描述: {settings.brand_description or '未设置'}")
        
        # SEO配置
        self.stdout.write(f"\n🔍 SEO配置:")
        self.stdout.write(f"   默认标题: {settings.default_title or '未设置'}")
        self.stdout.write(f"   默认描述: {settings.default_description or '未设置'}")
        self.stdout.write(f"   默认关键词: {settings.default_keywords or '未设置'}")
        self.stdout.write(f"   Robots.txt: {'启用' if settings.robots_txt_enabled else '禁用'}")
        
        # 分析配置
        self.stdout.write(f"\n📈 分析配置:")
        self.stdout.write(f"   Google Analytics: {settings.google_analytics_id or '未设置'}")
        self.stdout.write(f"   百度统计: {settings.baidu_analytics_id or '未设置'}")
        self.stdout.write(f"   用户行为跟踪: {'启用' if settings.track_user_behavior else '禁用'}")
        
        # 内容配置
        self.stdout.write(f"\n📝 内容配置:")
        self.stdout.write(f"   默认语言: {settings.default_language}")
        self.stdout.write(f"   支持语言: {', '.join(settings.supported_languages)}")
        self.stdout.write(f"   时区: {settings.timezone}")
        self.stdout.write(f"   自动发布: {'启用' if settings.auto_publish else '禁用'}")
    
    def output_all_sites_table(self, sites, detailed):
        """输出所有站点的配置表格"""
        self.stdout.write(f"\n🌐 所有站点配置预览")
        self.stdout.write("=" * 80)
        
        for site in sites:
            try:
                settings = SiteSettings.get_for_site(site)
                status = settings.config_status
                
                # 站点基本信息
                self.stdout.write(f"\n📍 {site.site_name} ({site.hostname})")
                self.stdout.write(f"   配置状态: {status['score']}/100")
                
                if status['warnings']:
                    self.stdout.write(self.style.WARNING(f"   ⚠️  {len(status['warnings'])} 个警告"))
                
                if detailed:
                    # 显示关键配置
                    summary = settings.config_summary
                    self.stdout.write(f"   主题: {summary['ui']['theme']}")
                    self.stdout.write(f"   推荐功能: {'启用' if summary['features']['recommendation'] else '禁用'}")
                    self.stdout.write(f"   搜索功能: {'启用' if summary['features']['search'] else '禁用'}")
                    self.stdout.write(f"   缓存时间: {summary['performance']['cache_timeout']}")
                
            except Exception as e:
                self.stdout.write(f"   ❌ 配置加载失败: {e}")
        
        self.stdout.write(f"\n🎉 总计: {sites.count()} 个站点")
    
    def output_json(self, settings, detailed):
        """输出JSON格式的配置信息"""
        config_data = self.get_config_data(settings, detailed)
        self.stdout.write(json.dumps(config_data, indent=2, ensure_ascii=False))
    
    def get_config_data(self, settings, detailed):
        """获取配置数据"""
        if detailed:
            return {
                'site_info': settings.config_summary['site_info'],
                'config_status': settings.config_status,
                'features': settings.config_summary['features'],
                'ui': settings.config_summary['ui'],
                'performance': settings.config_summary['performance'],
                'analytics': settings.config_summary['analytics'],
                'brand': {
                    'brand_name': settings.brand_name,
                    'brand_logo': settings.brand_logo,
                    'brand_description': settings.brand_description,
                },
                'seo': {
                    'default_title': settings.default_title,
                    'default_description': settings.default_description,
                    'default_keywords': settings.default_keywords,
                    'robots_txt_enabled': settings.robots_txt_enabled,
                    'structured_data': settings.structured_data,
                    'social_meta_tags': settings.social_meta_tags,
                },
                'content': {
                    'default_language': settings.default_language,
                    'supported_languages': settings.supported_languages,
                    'timezone': settings.timezone,
                    'date_format': settings.date_format,
                    'auto_publish': settings.auto_publish,
                    'content_approval_required': settings.content_approval_required,
                }
            }
        else:
            return {
                'site_info': settings.config_summary['site_info'],
                'config_status': settings.config_status,
                'features': settings.config_summary['features'],
                'ui': settings.config_summary['ui'],
                'performance': settings.config_summary['performance'],
                'analytics': settings.config_summary['analytics'],
            }
