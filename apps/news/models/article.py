from django.db import models
from django import forms
from wagtail.fields import RichTextField
from wagtail.models import Page, Site
from wagtail.admin.panels import (
    FieldPanel, MultiFieldPanel, TabbedInterface, ObjectList, HelpPanel
)
from wagtail.admin.widgets import AdminDateTimeInput
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from modelcluster.contrib.taggit import ClusterTaggableManager
from ..rich_text_features import get_news_editor_features, get_advanced_news_editor_features


class ArticlePageTag(TaggedItemBase):
    content_object = ParentalKey('ArticlePage', related_name='tagged_items', on_delete=models.CASCADE)
    # 站点维度（用于多站点过滤与聚合）
    site = models.ForeignKey(Site, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['site']),
        ]


class ArticlePage(Page):
    """
    文章页面模型
    
    符合专业新闻网站标准，支持多站点聚合策略
    """
    
    # === 基础内容 ===
    excerpt = models.TextField(blank=True, verbose_name="文章摘要", 
                              help_text="文章摘要，用于列表页展示和SEO")
    # 使用专业新闻编辑器配置 - 高级功能版本
    body = RichTextField(
        features=get_advanced_news_editor_features(),  # 使用高级配置
        verbose_name="正文内容",
        help_text="✍️ 专业新闻编辑器 - 支持丰富的格式、媒体内容和表格功能"
    )
    cover = models.ForeignKey(
        'wagtailimages.Image',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="封面图片"
    )
    
    # === 分类关联 ===
    channel = models.ForeignKey(
        'core.Channel',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='articles',
        verbose_name="频道",
        help_text="⚠️ 请只选择当前站点关联的频道（如上海站点请勿选择北京本地等其他站点专属频道）"
    )
    categories = models.ManyToManyField(
        'core.Category',
        blank=True,
        related_name='articles',
        verbose_name="分类",
        help_text="选择文章所属的分类（可多选）"
    )
    region = models.ForeignKey(
        'core.Region', 
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='articles',
        verbose_name="地区",
        help_text="⚠️ 请只选择当前站点关联的地区"
    )
    topics = models.ManyToManyField(
        'news.Topic',
        blank=True,
        related_name='articles',
        verbose_name="专题",
        help_text="选择文章所属的专题（可多选）"
    )
    
    # === 新闻专业属性 ===
    author_name = models.CharField(max_length=64, blank=True, verbose_name="作者",
                                  help_text="记者或作者姓名")
    language = models.ForeignKey(
        'core.Language',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="语言",
        help_text="文章的语言"
    )
    has_video = models.BooleanField(default=False, verbose_name="包含视频",
                                   help_text="标记是否包含视频内容")
    tags = ClusterTaggableManager(through=ArticlePageTag, blank=True, verbose_name="标签")
    
    # === 聚合策略 ===
    source_type = models.CharField(
        max_length=20,
        choices=[
            ('internal', '内部站点'),
            ('external', '外部网站'),
        ],
        default='internal',
        verbose_name="来源类型",
        help_text="文章来源类型：内部站点或外部网站"
    )
    
    # 内部站点来源（当 source_type='internal' 时使用）
    source_site = models.ForeignKey(
        Site,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sourced_articles',
        verbose_name="来源站点",
        help_text="内部站点的原始来源"
    )
    
    # 外部网站来源（当 source_type='external' 时使用）
    external_site = models.ForeignKey(
        'core.ExternalSite',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='external_articles',
        verbose_name="外部网站",
        help_text="外部网站的来源信息"
    )
    
    allow_aggregate = models.BooleanField(default=True, verbose_name="允许聚合",
                                         help_text="是否允许在其他站点聚合显示")
    canonical_url = models.URLField(blank=True, verbose_name="规范链接",
                                   help_text="SEO规范链接，通常指向原始发布地址")
    
    # 外部文章特有字段
    external_article_url = models.URLField(blank=True, verbose_name="外部文章链接",
                                          help_text="外部网站的原始文章链接")
    
    # === 权重排序 ===
    is_featured = models.BooleanField(default=False, verbose_name="置顶推荐",
                                     help_text="是否在首页或频道页置顶显示")
    weight = models.IntegerField(default=0, verbose_name="权重",
                                help_text="数值越大权重越高，影响排序")
    
    # === 时间字段 ===
    publish_at = models.DateTimeField(null=True, blank=True, verbose_name="发布时间",
                                     help_text="实际发布时间，可不同于创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    @property
    def effective_publish_time(self):
        """
        统一的发布时间接口 - 业务逻辑的单一入口
        优先使用 Wagtail 原生时间，确保与CMS功能一致
        """
        return self.first_published_at or self.publish_at
    
    @property  
    def display_publish_time(self):
        """前端显示用的发布时间"""
        return self.effective_publish_time
        
    @property
    def sort_publish_time(self):
        """排序用的发布时间"""
        return self.effective_publish_time
    
    # Wagtail管理界面配置 - 专业新闻编辑优化版
    content_panels = Page.content_panels + [
        # 核心内容 - 最重要，始终展开
        MultiFieldPanel([
            HelpPanel(
                content="""
                <div style="background: #e7f3ff; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <strong>📝 第一步：撰写内容</strong><br/>
                    专注于文章的核心内容创作，其他设置可稍后完成
                </div>
                """
            ),
            FieldPanel('excerpt', help_text="📋 文章摘要，50-100字，用于列表展示和SEO"),
            FieldPanel('cover', help_text="🖼️ 文章配图，建议16:9比例"),
            FieldPanel('body', help_text="✍️ 文章正文内容"),
        ], 
        heading="📰 文章内容", 
        classname="full"),
        
        # 新闻属性 - 编辑关心的核心属性
        MultiFieldPanel([
            HelpPanel(
                content="""
                <div style="background: #fff3e0; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <strong>⚡ 第二步：设置文章属性</strong><br/>
                    设置文章的基本属性，便于管理和展示
                </div>
                """
            ),
            FieldPanel('author_name', help_text="👤 记者或作者姓名"),
            FieldPanel('language', help_text="🌐 文章语言"),
            FieldPanel('has_video', help_text="📹 标记是否包含视频内容"),
            FieldPanel('publish_at', 
                      widget=AdminDateTimeInput,
                      help_text="⏰ 留空立即发布，设置时间可定时发布"),
        ], 
        heading="⚡ 文章属性", 
        classname="collapsed"),
        
        # 分类与标签 - 重要但可以后设置
        MultiFieldPanel([
            HelpPanel(
                content="""
                <div style="background: #f1f8e9; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <strong>🏷️ 第三步：分类归档</strong><br/>
                    为文章添加分类和标签，便于读者发现和检索<br/>
                    💡 <em>提示：使用"建议标签"功能可以自动生成相关标签</em>
                </div>
                """
            ),
            FieldPanel('channel', help_text="📂 选择文章所属频道"),
            FieldPanel('categories', 
                      widget=forms.CheckboxSelectMultiple,
                      help_text="📝 选择相关栏目（可多选）"),
            FieldPanel('region', help_text="🌍 文章相关地区"),
            FieldPanel('topics', 
                      widget=forms.CheckboxSelectMultiple,
                      help_text="🎯 选择相关专题（可多选）"),
            FieldPanel('tags', help_text="🏷️ 添加相关标签，用逗号分隔"),
        ], 
        heading="🏷️ 分类标签", 
        classname="collapsed"),
        
        # 发布设置
        MultiFieldPanel([
            FieldPanel('is_featured', help_text="⭐ 是否在首页或频道页置顶显示"),
            FieldPanel('weight', help_text="📊 权重数值，越大越靠前（0为不置顶）"),
        ], 
        heading="📢 发布设置", 
        classname="collapsed"),
    ]
    
    # 高级设置面板 - 技术配置
    advanced_panels = [
        HelpPanel(
            content="""
            <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>⚙️ 高级设置</strong><br/>
                技术配置选项，一般编辑无需修改
            </div>
            """
        ),
        
        MultiFieldPanel([
            FieldPanel('source_type', help_text="📍 文章来源类型"),
            FieldPanel('source_site', help_text="🔗 内部来源站点"),
            FieldPanel('external_site', help_text="🌐 外部来源网站"),
            FieldPanel('external_article_url', help_text="🔗 外部文章链接"),
            FieldPanel('allow_aggregate', help_text="🔄 是否允许在其他站点聚合"),
            FieldPanel('canonical_url', help_text="🎯 SEO规范链接"),
        ], heading="🔗 来源与聚合"),
    ]
    
    # 编辑工作流标签页
    editorial_panels = [
        HelpPanel(
            content="""
            <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>👥 编辑工作流</strong><br/>
                编辑部内部协作和流程管理工具
            </div>
            """
        ),
        
        MultiFieldPanel([
            # 注意：这些字段目前在模型中不存在，仅作为示例展示如何扩展
            # FieldPanel('editor_name', help_text="✏️ 责任编辑姓名"),
            # FieldPanel('editor_notes', help_text="💬 编辑备注（内部交流使用）"),
            # FieldPanel('fact_checked', help_text="☑️ 内容已核实"),
            # FieldPanel('legal_reviewed', help_text="⚖️ 法务已审核"),
            HelpPanel("📝 编辑工作流功能正在开发中...")
        ], heading="👥 协作信息"),
    ]
    
    # SEO优化标签页
    seo_panels = [
        HelpPanel(
            content="""
            <div style="background: #fff8e1; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>🎯 SEO优化</strong><br/>
                搜索引擎优化和社交媒体分享设置
            </div>
            """
        ),
        
        MultiFieldPanel([
            FieldPanel('excerpt', help_text="📝 SEO描述，用于搜索结果显示"),
            FieldPanel('tags', help_text="🏷️ SEO关键词标签"),
            # 注意：这些字段需要在模型中添加
            # FieldPanel('meta_keywords', help_text="🔍 SEO关键词"),
            # FieldPanel('social_image', help_text="📱 社交媒体分享图片"),
            HelpPanel("🚧 更多SEO功能即将上线...")
        ], heading="🎯 SEO设置"),
    ]

    # 使用模块化的多标签页界面系统
    # 导入在文件顶部完成，这里只是配置选择
    
    # 你可以从以下几种预设配置中选择：
    
    # 方案1: 基础编辑界面 (推荐给一般编辑使用) ✅ 当前启用  
    # edit_handler 将在类定义完成后设置，避免循环导入
    
    # 方案2: 专业编辑界面 (包含编辑工作流)
    # edit_handler = None  # 将使用 get_professional_interface()
    
    # 方案3: 企业级完整界面 (包含所有功能)
    # edit_handler = None  # 将使用 get_enterprise_interface()
    
    # 方案4: 根据用户角色动态配置
    # edit_handler = None  # 将使用 get_custom_tab_interface()
    
    def clean(self):
        """
        自定义验证：确保选择的频道和地区与当前站点兼容
        """
        # 先调用父类的clean方法
        super().clean()
        
        # 获取当前站点
        current_site = None
        try:
            # 尝试从路径推断站点
            if hasattr(self, 'path') and self.path:
                # 从路径获取父页面，然后获取站点
                from wagtail.models import Page
                parent_path = self.path[:-4]  # 去掉最后4位
                try:
                    parent_page = Page.objects.get(path=parent_path)
                    current_site = parent_page.get_site()
                except:
                    pass
            
            # 如果还是无法获取，尝试直接获取
            if not current_site:
                current_site = self.get_site()
        except:
            # 如果无法获取站点，跳过验证
            return
        
        # 验证频道
        if self.channel and current_site:
            # 检查频道是否关联到当前站点
            if not self.channel.sites.filter(id=current_site.id).exists():
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'channel': f'所选频道 "{self.channel.name}" 未关联到当前站点 "{current_site.hostname}"。请选择正确的频道。'
                })
        
        # 验证地区
        if self.region and current_site:
            # 检查地区是否关联到当前站点
            if not self.region.sites.filter(id=current_site.id).exists():
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'region': f'所选地区 "{self.region.name}" 未关联到当前站点 "{current_site.hostname}"。请选择正确的地区。'
                })
    
    class Meta:
        verbose_name = "文章"
        verbose_name_plural = "文章"
        indexes = [
            # 设计文档要求的联合索引
            models.Index(fields=['publish_at', 'channel', 'region'], name='art_pub_chan_reg'),
            models.Index(fields=['is_featured', 'weight', 'publish_at'], name='art_feat_weight_pub'),
            models.Index(fields=['language_id', 'region'], name='art_lang_region'),
            models.Index(fields=['has_video', 'is_featured'], name='art_video_feat'),
        ]
    
    def __str__(self):
        return self.title
    
    def get_absolute_url(self):
        """获取文章的绝对URL"""
        if self.canonical_url:
            return self.canonical_url
        return super().get_absolute_url()
    
    def is_aggregated_content(self):
        """判断是否为聚合内容"""
        return self.source_site is not None and self.source_site != self.get_site()
    
    def get_display_content(self):
        """根据聚合策略返回显示内容"""
        if self.is_aggregated_content():
            # 聚合文章只显示摘要
            return self.excerpt
        else:
            # 自产文章显示全文
            return self.body
    
    @property
    def topic_slug(self):
        """向后兼容属性：获取专题的 slug"""
        return self.topic.slug if self.topic else ''
    
    def get_categories_list(self):
        """获取分类列表"""
        return list(self.categories.filter(is_active=True).order_by('order', 'name'))
    
    def get_category_names(self):
        """获取分类名称列表"""
        return [cat.name for cat in self.get_categories_list()]



# 使用优化的管理界面配置
from ..admin_panels import get_tabbed_interface

# 设置多标签页界面 - 使用专业新闻编辑界面
ArticlePage.edit_handler = get_tabbed_interface()