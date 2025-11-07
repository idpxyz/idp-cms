"""
频道权限管理模型

允许为用户组设置只能访问特定频道的权限
"""
from django.db import models
from django.contrib.auth.models import Group
from wagtail.admin.panels import FieldPanel
from wagtail.snippets.models import register_snippet
from django.utils.translation import gettext_lazy as _
from django import forms


@register_snippet
class ChannelGroupPermission(models.Model):
    """
    频道用户组权限
    
    用于控制特定用户组只能访问指定的频道
    """
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='channel_permissions',
        verbose_name="用户组",
        help_text="选择要授予频道权限的用户组"
    )
    
    channels = models.ManyToManyField(
        'core.Channel',
        related_name='group_permissions',
        verbose_name="可访问的频道",
        help_text="该用户组可以访问的频道列表（留空表示可访问所有频道）"
    )
    
    # 权限类型
    can_view = models.BooleanField(
        default=True,
        verbose_name="可查看",
        help_text="可以查看频道内容"
    )
    
    can_edit = models.BooleanField(
        default=False,
        verbose_name="可编辑",
        help_text="可以编辑频道设置"
    )
    
    can_publish = models.BooleanField(
        default=False,
        verbose_name="可发布文章",
        help_text="可以在该频道下发布文章"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    panels = [
        FieldPanel('group'),
        FieldPanel('channels', widget=forms.CheckboxSelectMultiple),
        FieldPanel('can_view'),
        FieldPanel('can_edit'),
        FieldPanel('can_publish'),
    ]
    
    class Meta:
        verbose_name = "频道权限"
        verbose_name_plural = "频道权限管理"
        unique_together = [['group']]  # 每个用户组只能有一个权限配置
        db_table = "core_channel_group_permission"
        ordering = ['group__name']
    
    def __str__(self):
        channel_count = self.channels.count()
        if channel_count == 0:
            return f"{self.group.name} - 所有频道"
        return f"{self.group.name} - {channel_count}个频道"
    
    @classmethod
    def get_accessible_channels(cls, user):
        """
        获取用户可访问的频道列表
        
        Args:
            user: Django User 对象
            
        Returns:
            QuerySet: 用户可访问的频道查询集，如果没有限制则返回 None
        """
        from .channel import Channel
        
        # 超级管理员可以访问所有频道
        if user.is_superuser:
            return None  # None 表示无限制
        
        # 获取用户所属的所有用户组
        user_groups = user.groups.all()
        
        # 查找这些用户组的频道权限
        permissions = cls.objects.filter(group__in=user_groups, can_view=True)
        
        if not permissions.exists():
            # 如果没有配置权限，默认可以访问所有频道
            return None
        
        # 收集所有可访问的频道
        accessible_channel_ids = set()
        has_empty_permission = False  # 是否有"可访问所有频道"的权限
        
        for perm in permissions:
            if perm.channels.count() == 0:
                # 该用户组可以访问所有频道
                has_empty_permission = True
                break
            accessible_channel_ids.update(perm.channels.values_list('id', flat=True))
        
        if has_empty_permission:
            return None  # 可以访问所有频道
        
        if not accessible_channel_ids:
            # 没有可访问的频道，返回空查询集
            return Channel.objects.none()
        
        # 返回可访问的频道
        return Channel.objects.filter(id__in=accessible_channel_ids)
    
    @classmethod
    def user_can_edit_channel(cls, user, channel):
        """
        检查用户是否可以编辑特定频道
        
        Args:
            user: Django User 对象
            channel: Channel 对象
            
        Returns:
            bool: 是否有编辑权限
        """
        if user.is_superuser:
            return True
        
        user_groups = user.groups.all()
        permissions = cls.objects.filter(
            group__in=user_groups,
            can_edit=True
        )
        
        for perm in permissions:
            # 如果该权限没有指定频道（即所有频道），则有权限
            if perm.channels.count() == 0:
                return True
            # 如果该频道在权限列表中，则有权限
            if perm.channels.filter(id=channel.id).exists():
                return True
        
        return False
    
    @classmethod
    def user_can_publish_to_channel(cls, user, channel):
        """
        检查用户是否可以在特定频道发布文章
        
        Args:
            user: Django User 对象
            channel: Channel 对象
            
        Returns:
            bool: 是否有发布权限
        """
        if user.is_superuser:
            return True
        
        user_groups = user.groups.all()
        permissions = cls.objects.filter(
            group__in=user_groups,
            can_publish=True
        )
        
        for perm in permissions:
            # 如果该权限没有指定频道（即所有频道），则有权限
            if perm.channels.count() == 0:
                return True
            # 如果该频道在权限列表中，则有权限
            if perm.channels.filter(id=channel.id).exists():
                return True
        
        return False

