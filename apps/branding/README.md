# CMS 管理后台品牌化

基于 Wagtail 7.1.1 官方最佳实践的完整品牌化解决方案。

## 功能特性

- ✅ 自定义 Logo 和品牌标识
- ✅ 登录页面完全定制
- ✅ "记住我"功能
- ✅ 专业渐变背景设计
- ✅ 明暗主题支持
- ✅ 国际化支持
- ✅ 响应式设计

## 安装配置

### 1. 确保应用顺序

在 `settings.py` 中，确保 `apps.branding` 在 `wagtail.admin` 之前：

```python
INSTALLED_APPS = [
    # ...
    "apps.branding",      # 必须在 wagtail.admin 之前
    "wagtail",
    "wagtail.admin",
    # ...
]
```

### 2. 启用记住我功能（可选）

在 `settings.py` 的 `MIDDLEWARE` 中添加：

```python
MIDDLEWARE = [
    # ...
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.branding.middleware.AdminRememberMeMiddleware",  # 添加这行
    # ...
]
```

### 3. 收集静态文件

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring python manage.py collectstatic --noinput
```

### 4. 重启服务

```bash
docker compose -f infra/local/docker-compose.yaml restart authoring
```

## 自定义配置

### 替换 Logo

- 编辑 `apps/branding/static/images/cms-logo.svg`
- 建议尺寸：140x40px（登录页）

### 替换 Favicon

- 替换 `apps/branding/static/images/cms-favicon.png`
- 建议尺寸：32x32px 或 16x16px

### 自定义颜色

编辑 `apps/branding/static/css/cms-admin.css` 中的 CSS 变量：

```css
:root,
.w-theme-light {
  --w-color-primary: #007cba; /* 主品牌色 */
}
```

### 启用 SSO 登录（可选）

在 `apps/branding/templates/wagtailadmin/login.html` 中取消注释 SSO 按钮：

```django
<a class="button button-secondary" href="/accounts/sso/login/">
  {% trans "使用 SSO 登录" %}
</a>
```

## 文件结构

```
apps/branding/
├── __init__.py
├── apps.py
├── middleware.py              # 记住我中间件
├── wagtail_hooks.py          # CSS注入hook
├── static/
│   ├── css/cms-admin.css     # 自定义样式
│   └── images/
│       ├── cms-logo.svg      # Logo文件
│       └── cms-favicon.png   # Favicon文件
└── templates/wagtailadmin/
    ├── login.html            # 登录页完整定制
    └── admin_base.html       # 标题+favicon
```

## 兼容性

- ✅ Wagtail 7.1.x
- ✅ Django 4.x+
- ✅ 明暗主题
- ✅ 响应式设计

## 技术特点

- 使用官方模板块，升级安全
- 不修改 Wagtail 核心代码
- 完全可自定义
- 生产环境就绪
