"""
为每个站点创建媒体集合和权限管理命令
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Collection, Site
from wagtail.users.models import UserProfile
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = '为每个站点创建媒体集合和权限'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            help='只为指定站点创建集合 (portal, beijing, shanghai, hangzhou, shenzhen)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='显示将要执行的操作但不实际执行',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        specific_site = options.get('site')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN 模式 - 仅显示操作，不会实际执行'))
        
        self.stdout.write(self.style.SUCCESS('=== 媒体集合和权限设置开始 ==='))
        
        # 站点配置映射
        sites_config = {
            'portal': {
                'collection_name': 'Portal Media',
                'group_name': 'Portal Editors',
                'description': '门户站点媒体资源'
            },
            'beijing': {
                'collection_name': 'Beijing Media', 
                'group_name': 'Beijing Editors',
                'description': '北京站点媒体资源'
            },
            'shanghai': {
                'collection_name': 'Shanghai Media',
                'group_name': 'Shanghai Editors', 
                'description': '上海站点媒体资源'
            },
            'hangzhou': {
                'collection_name': 'Hangzhou Media',
                'group_name': 'Hangzhou Editors',
                'description': '杭州站点媒体资源'
            },
            'shenzhen': {
                'collection_name': 'Shenzhen Media',
                'group_name': 'Shenzhen Editors',
                'description': '深圳站点媒体资源'
            }
        }
        
        # 过滤指定站点
        if specific_site:
            if specific_site not in sites_config:
                self.stdout.write(
                    self.style.ERROR(f'❌ 未知站点: {specific_site}')
                )
                return
            sites_config = {specific_site: sites_config[specific_site]}
        
        # 获取根集合
        try:
            root_collection = Collection.get_first_root_node()
            self.stdout.write(f'📁 根集合: {root_collection.name}')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ 无法获取根集合: {e}')
            )
            return
        
        created_collections = 0
        created_groups = 0
        
        for site_slug, config in sites_config.items():
            self.stdout.write(f'\n🔄 处理站点: {site_slug}')
            
            collection_name = config['collection_name']
            group_name = config['group_name'] 
            description = config['description']
            
            if not dry_run:
                with transaction.atomic():
                    # 创建或获取集合
                    collection, collection_created = self._create_collection(
                        root_collection, collection_name, description
                    )
                    
                    if collection_created:
                        created_collections += 1
                        self.stdout.write(f'  ✅ 创建集合: {collection_name}')
                    else:
                        self.stdout.write(f'  ⏭️  集合已存在: {collection_name}')
                    
                    # 创建或获取用户组
                    group, group_created = self._create_group(group_name)
                    
                    if group_created:
                        created_groups += 1
                        self.stdout.write(f'  ✅ 创建用户组: {group_name}')
                    else:
                        self.stdout.write(f'  ⏭️  用户组已存在: {group_name}')
                    
                    # 设置集合权限
                    permissions_set = self._setup_collection_permissions(group, collection)
                    if permissions_set:
                        self.stdout.write(f'  ✅ 设置集合权限: {permissions_set} 个权限')
            else:
                # Dry run 模式
                self.stdout.write(f'  📋 将创建集合: {collection_name}')
                self.stdout.write(f'  📋 将创建用户组: {group_name}')
                self.stdout.write(f'  📋 将设置权限: 图片和文档的增删改权限')
        
        if not dry_run:
            self.stdout.write(f'\n🎉 操作完成!')
            self.stdout.write(f'   📁 创建集合: {created_collections} 个')
            self.stdout.write(f'   👥 创建用户组: {created_groups} 个')
            self.stdout.write(f'   🔐 权限配置完成')
        else:
            self.stdout.write(f'\n💡 使用 --dry-run=false 执行实际操作')
    
    def _create_collection(self, root_collection, name, description):
        """创建或获取集合"""
        # 检查集合是否已存在
        try:
            collection = Collection.objects.get(name=name)
            return collection, False
        except Collection.DoesNotExist:
            pass
        
        # 创建新集合作为根集合的子集合
        collection = root_collection.add_child(name=name)
        return collection, True
    
    def _create_group(self, name):
        """创建或获取用户组"""
        group, created = Group.objects.get_or_create(name=name)
        return group, created
    
    def _setup_collection_permissions(self, group, collection):
        """为用户组设置集合权限"""
        from wagtail.models import GroupCollectionPermission
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        
        permissions_count = 0
        
        # 权限类型映射 - 需要匹配Django权限名称
        permission_mappings = {
            'add_image': 'wagtailimages.add_image',
            'change_image': 'wagtailimages.change_image',
            'delete_image': 'wagtailimages.delete_image',
            'choose_image': 'wagtailimages.choose_image',
            'add_document': 'wagtaildocs.add_document',
            'change_document': 'wagtaildocs.change_document', 
            'delete_document': 'wagtaildocs.delete_document',
            'choose_document': 'wagtaildocs.choose_document'
        }
        
        for permission_type, permission_codename in permission_mappings.items():
            try:
                # 获取权限对象
                app_label, codename = permission_codename.split('.')
                try:
                    permission_obj = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename
                    )
                except Permission.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  权限不存在: {permission_codename}')
                    )
                    continue
                
                # 创建集合权限
                group_permission, created = GroupCollectionPermission.objects.get_or_create(
                    group=group,
                    collection=collection,
                    permission=permission_obj
                )
                if created:
                    permissions_count += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  设置权限失败 {permission_type}: {e}')
                )
        
        return permissions_count
