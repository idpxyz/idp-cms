"""
站点配置管理命令

使用方法:
  python manage.py site_config list                          # 列出所有站点
  python manage.py site_config show localhost                # 显示站点配置
  python manage.py site_config create new-site               # 创建新站点配置
  python manage.py site_config update localhost key=value    # 更新配置
  python manage.py site_config delete old-site               # 删除站点配置
  python manage.py site_config validate                      # 验证所有配置
"""

import json
import yaml
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.conf import settings
import json

try:
    from apps.core.site_config import config_manager
    CONFIG_SYSTEM_AVAILABLE = True
except ImportError:
    CONFIG_SYSTEM_AVAILABLE = False

class Command(BaseCommand):
    help = '管理站点配置'
    
    def add_arguments(self, parser):
        parser.add_argument('action', choices=['list', 'show', 'create', 'update', 'delete', 'validate'], 
                          help='操作类型')
        parser.add_argument('--site', help='站点ID (hostname)')
        parser.add_argument('--key', help='配置键 (支持点号分隔，如 features.recommendation)')
        parser.add_argument('--value', help='配置值')
        parser.add_argument('--format', choices=['table', 'json', 'yaml'], default='table',
                          help='输出格式')
        parser.add_argument('--force', action='store_true', help='强制操作')
    
    def handle(self, *args, **options):
        if not CONFIG_SYSTEM_AVAILABLE:
            raise CommandError("配置管理系统不可用")
        
        action = options['action']
        
        if action == 'list':
            self.handle_list(options)
        elif action == 'show':
            self.handle_show(options)
        elif action == 'create':
            self.handle_create(options)
        elif action == 'update':
            self.handle_update(options)
        elif action == 'delete':
            self.handle_delete(options)
        elif action == 'validate':
            self.handle_validate(options)
    
    def handle_list(self, options):
        """列出所有站点配置"""
        sites = config_manager.list_sites()
        format_type = options['format']

        if not sites:
            self.stdout.write(self.style.WARNING('没有找到站点配置'))
            return

        if format_type == 'json':
            configs = {}
            for site_id in sites:
                config = config_manager.get_config(site_id)
                configs[site_id] = {
                    'site_name': config.site_name,
                    'site_url': config.site_url,
                    'description': config.description,
                    'theme': config.ui.theme,
                    'cache_timeout': config.performance.cache_timeout,
                }
            self.stdout.write(json.dumps(configs, indent=2, ensure_ascii=False))
            
        elif format_type == 'yaml':
            configs = {}
            for site_id in sites:
                config = config_manager.get_config(site_id)
                configs[site_id] = {
                    'site_name': config.site_name,
                    'site_url': config.site_url,
                    'description': config.description,
                    'theme': config.ui.theme,
                    'cache_timeout': config.performance.cache_timeout,
                }
            self.stdout.write(yaml.dump(configs, default_flow_style=False, allow_unicode=True))
            
        else:  # table
            self.stdout.write("\n📋 站点配置列表:")
            self.stdout.write("-" * 100)
            self.stdout.write(f"{'站点ID':<25} {'站点名称':<20} {'主题':<15} {'缓存时间':<10} {'状态':<10}")
            self.stdout.write("-" * 100)
            
            for site_id in sorted(sites):
                try:
                    config = config_manager.get_config(site_id)
                    cache_status = "✅ 数据库" if hasattr(config, 'version') and config.version == "2.0" else "📄 文件"
                    self.stdout.write(f"{site_id:<25} {config.site_name:<20} {config.ui.theme:<15} {config.performance.cache_timeout:<10}s {cache_status:<10}")
                except Exception as e:
                    self.stdout.write(f"{site_id:<25} {'错误':<20} {'-':<15} {'-':<10} ❌ 错误")
                
            self.stdout.write(f"\n总计: {len(sites)} 个站点")
    
    def handle_show(self, options):
        """显示站点配置"""
        site_id = options['site']
        if not site_id:
            raise CommandError("必须指定 --site 参数")
        
        try:
            config = config_manager.get_config(site_id)
            
            if options['key']:
                # 显示特定配置项
                value = self._get_nested_value(config, options['key'])
                if value is not None:
                    self.stdout.write(f"{options['key']}: {value}")
                else:
                    self.stdout.write(self.style.ERROR(f"配置项 {options['key']} 不存在"))
            else:
                # 显示完整配置
                self.stdout.write(f"\n🔍 站点配置: {site_id}")
                self.stdout.write("=" * 60)
                self.stdout.write(f"站点名称: {config.site_name}")
                self.stdout.write(f"站点URL: {config.site_url}")
                self.stdout.write(f"描述: {config.description}")
                self.stdout.write(f"主题: {config.ui.theme}")
                self.stdout.write(f"缓存时间: {config.performance.cache_timeout}秒")
                self.stdout.write(f"配置源: {'数据库' if hasattr(config, 'version') and config.version == '2.0' else '文件'}")
                
        except Exception as e:
            raise CommandError(f"显示配置失败: {e}")
    
    def handle_delete(self, options):
        """删除站点配置"""
        site_id = options['site']
        if not site_id:
            raise CommandError("必须指定 --site 参数")
        
        try:
            from .models import SiteSettings
            from wagtail.models import Site
            
            site = Site.objects.get(hostname=site_id)
            settings = SiteSettings.objects.get(site=site)
            settings.delete()
            
            self.stdout.write(self.style.SUCCESS(f"✅ 成功删除站点配置: {site_id}"))
            
        except Site.DoesNotExist:
            raise CommandError(f"站点 {site_id} 不存在")
        except SiteSettings.DoesNotExist:
            raise CommandError(f"站点 {site_id} 没有配置")
        except Exception as e:
            raise CommandError(f"删除配置失败: {e}")
    
    def handle_validate(self, options):
        """验证配置"""
        site_id = options.get('site')
        
        if site_id:
            # 验证单个站点
            try:
                config = config_manager.get_config(site_id)
                self.stdout.write(f"✅ 站点 {site_id} 配置验证通过")
                self.stdout.write(f"   配置源: 数据库")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ 站点 {site_id} 配置验证失败: {e}"))
        else:
            # 验证所有站点
            sites = config_manager.list_sites()
            valid_count = 0
            total_count = len(sites)
            
            self.stdout.write(f"🔍 验证 {total_count} 个站点的配置...")
            
            for site_id in sites:
                try:
                    config = config_manager.get_config(site_id)
                    valid_count += 1
                    self.stdout.write(f"  ✅ {site_id}")
                except Exception as e:
                    self.stdout.write(f"  ❌ {site_id}: {e}")
            
            self.stdout.write(f"\n🎉 验证完成: {valid_count}/{total_count} 个站点配置有效")
    
    def _get_nested_value(self, obj, key_path):
        """获取嵌套对象的属性值"""
        keys = key_path.split('.')
        current = obj
        
        for key in keys:
            if hasattr(current, key):
                current = getattr(current, key)
            else:
                return None
        
        return current
    
    def handle_create(self, options):
        """创建新站点配置"""
        site_id = options['site']
        if not site_id:
            raise CommandError("必须指定 --site 参数")
        
        try:
            from wagtail.models import Site
            site = Site.objects.get(hostname=site_id)
            
            # 创建默认配置
            config = config_manager.create_config(site_id, {})
            self.stdout.write(self.style.SUCCESS(f"✅ 成功创建站点配置: {site_id}"))
            
        except Site.DoesNotExist:
            raise CommandError(f"站点 {site_id} 在Wagtail中不存在，请先创建站点")
        except Exception as e:
            raise CommandError(f"创建配置失败: {e}")
    
    def handle_update(self, options):
        """更新站点配置"""
        site_id = options['site']
        key = options['key']
        value = options['value']
        
        if not all([site_id, key, value]):
            raise CommandError("必须指定 --site、--key 和 --value 参数")
        
        try:
            # 解析嵌套键
            keys = key.split('.')
            updates = {}
            current = updates
            
            for k in keys[:-1]:
                current[k] = {}
                current = current[k]
            
            # 转换值类型
            current[keys[-1]] = self._convert_value(value)
            
            # 更新配置
            if config_manager.update_config(site_id, updates):
                self.stdout.write(self.style.SUCCESS(f"✅ 成功更新配置: {site_id}.{key} = {value}"))
            else:
                raise CommandError("配置更新失败")
                
        except Exception as e:
            raise CommandError(f"更新配置失败: {e}")
    
    def _convert_value(self, value_str):
        """转换字符串值到合适的类型"""
        # 布尔值
        if value_str.lower() in ('true', 'false'):
            return value_str.lower() == 'true'
        
        # 数字
        try:
            if '.' in value_str:
                return float(value_str)
            return int(value_str)
        except ValueError:
            pass
        
        # JSON 数组或对象
        if value_str.startswith(('{', '[')):
            try:
                return json.loads(value_str)
            except json.JSONDecodeError:
                pass
        
        # 逗号分隔的列表
        if ',' in value_str:
            return [item.strip() for item in value_str.split(',')]
        
        return value_str
