让我先查看一下当前的`SiteSettings`模型，然后制定一个完整的重构任务分解：

Read file: apps/core/models.py
很好！我看到您已经有了一个很好的`SiteSettings`模型。现在让我制定一个完整的重构任务分解：

## �� **重构任务分解 - 从 YAML 配置到 Wagtail 内置管理**

### **第一阶段：分析和准备（1-2 天）**

#### **1.1 现状分析** ✅

- [x] 分析现有 YAML 配置文件的使用情况
- [x] 检查 Wagtail 站点管理状态
- [x] 评估`SiteSettings`模型的完整性

#### **1.2 依赖关系梳理**

- [ ] 识别所有硬编码的站点名称引用
- [ ] 分析配置管理系统的依赖关系
- [ ] 制定迁移策略和回滚方案

### **第二阶段：模型完善（2-3 天）**

#### **2.1 扩展 SiteSettings 模型**

- [ ] 添加缺失的配置字段（功能开关、UI 主题等）
- [ ] 创建配置验证方法
- [ ] 添加配置继承和默认值机制

#### **2.2 创建配置管理接口**

- [ ] 实现配置的 CRUD 操作
- [ ] 添加配置缓存机制
- [ ] 创建配置验证规则

### **第三阶段：配置系统重构（3-4 天）**

#### **3.1 重构配置加载器**

- [ ] 修改`site_config.py`使用数据库而非文件
- [ ] 实现配置的动态更新
- [ ] 保持向后兼容性

#### **3.2 更新配置工具**

- [ ] 重构`site_utils.py`使用新的配置源
- [ ] 更新站点映射逻辑
- [ ] 优化配置查询性能

### **第四阶段：管理界面优化（2-3 天）**

#### **4.1 Wagtail Snippets 集成**

- [ ] 将`SiteSettings`注册为 Wagtail Snippet
- [ ] 自定义管理界面
- [ ] 添加配置编辑表单

#### **4.2 站点管理优化**

- [ ] 优化 Wagtail 内置的站点管理界面
- [ ] 添加配置快速访问链接
- [ ] 实现配置预览功能

### **第五阶段：清理和测试（2-3 天）**

#### **5.1 清理旧配置**

- [ ] 删除不必要的 YAML 配置文件
- [ ] 清理硬编码的站点引用
- [ ] 更新相关文档

#### **5.2 功能测试**

- [ ] 测试配置加载和更新
- [ ] 验证多站点功能
- [ ] 性能测试和优化

## �� **详细任务清单**

### **任务 1：完善 SiteSettings 模型**

```python
# 需要添加的字段
class SiteSettings(models.Model):
    # 功能开关
    ai_recommendation = models.BooleanField(default=True)
    search_enabled = models.BooleanField(default=True)
    comments_enabled = models.BooleanField(default=False)

    # UI主题
    theme = models.CharField(max_length=50, default="default")
    primary_color = models.CharField(max_length=7, default="#3B82F6")
    secondary_color = models.CharField(max_length=7, default="#6B7280")

    # 内容策略
    content_moderation = models.BooleanField(default=False)
    auto_publish = models.BooleanField(default=False)
    allow_aggregate = models.BooleanField(default=True)
```

### **任务 2：创建配置管理命令**

```bash
# 新的管理命令
python manage.py site_settings create --site=beijing.aivoya.com
python manage.py site_settings update --site=beijing.aivoya.com --key=theme --value=tech
python manage.py site_settings migrate --from-yaml
```

### **任务 3：重构配置加载器**

```python
# 修改apps/core/site_config.py
class ConfigLoader:
    def load_from_database(self, site_id: str) -> Optional[Dict[str, Any]]:
        """从数据库加载配置"""
        try:
            site = Site.objects.get(hostname=site_id)
            settings = SiteSettings.get_for_site(site)
            return self._serialize_settings(settings)
        except Site.DoesNotExist:
            return None
```

### **任务 4：更新管理界面**

```python
# 在apps/core/wagtail_hooks.py中
@hooks.register('construct_settings_panels')
def construct_site_settings_panels(panels, instance):
    """自定义站点设置面板"""
    panels.extend([
        FieldPanel('ai_recommendation'),
        FieldPanel('search_enabled'),
        FieldPanel('theme'),
        FieldPanel('primary_color'),
    ])
```

## �� **执行优先级**

### **高优先级** ��

1. 完善`SiteSettings`模型
2. 重构配置加载器
3. 创建迁移脚本

### **中优先级** 🟡

1. 优化管理界面
2. 清理旧配置文件
3. 更新文档

### **低优先级** ��

1. 性能优化
2. 高级功能
3. 监控和告警

## ⏱️ **时间估算**

- **总工期**: 10-15 天
- **关键路径**: 模型完善 → 配置重构 → 界面优化
- **风险点**: 配置迁移、向后兼容性

## �� **风险控制**

1. **渐进式迁移**: 先支持新系统，再逐步替换旧系统
2. **回滚方案**: 保留旧配置文件作为备份
3. **测试覆盖**: 每个阶段都要有完整的测试
4. **文档更新**: 及时更新相关文档和指南

您觉得这个任务分解合理吗？我们可以从哪个阶段开始？🚀
