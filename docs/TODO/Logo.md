明白，你在用 **Wagtail 7.1.1**。这一版的**官方做法**是：通过**覆写 admin 模板的 `branding_logo` 区块**来替换左上角的“鸟”logo，而不是用某个全局 setting。下面给你一个最小、稳定、可回滚的步骤集。

# 一步到位（最小可行方案）

1. 新建/选择一个用于后台品牌化的 app（示例名：`crm_branding`），并保证它在 `INSTALLED_APPS` 里**排在 `wagtail.admin` 之前**：

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "crm_branding",     # 放在 wagtail.admin 之前
    "wagtail",
    "wagtail.admin",
    # ...
]
```

（Wagtail 官方文档要求将放置自定义模板的 app 排在 `wagtail.admin` 前，以便模板优先级覆盖。([Wagtail Documentation][1])）

2. 在该 app 下创建模板文件，覆写 `branding_logo`：

```
crm_branding/
  templates/
    wagtailadmin/
      base.html
```

`crm_branding/templates/wagtailadmin/base.html`：

```django
{% extends "wagtailadmin/base.html" %}
{% load static %}

{% block branding_logo %}
  <img src="{% static 'images/crm-logo.svg' %}" alt="CRM Admin" width="96" height="32" />
{% endblock %}
```

（这是 7.1 文档中的标准方式：在 `wagtailadmin/base.html` 覆写 `branding_logo`。([Wagtail Documentation][1])）

3. 把你的 logo（建议 **SVG**）放到 `crm_branding/static/images/crm-logo.svg`，然后在开发环境重启服务；生产环境记得：

```bash
python manage.py collectstatic
```

> 到此，后台主界面左上角 logo 会被替换。

---

# 可选增强（登录页 / 404 / User Bar / Favicon / Title）

Wagtail 允许对其它页面也替换同一块 `branding_logo`，以及替换 favicon 和 title 前缀：

- **登录页**（可显示同款 logo）
  `crm_branding/templates/wagtailadmin/login.html`

  ```django
  {% extends "wagtailadmin/login.html" %}
  {% load static %}
  {% block branding_logo %}
    <img src="{% static 'images/crm-logo.svg' %}" alt="CRM Admin" width="120" />
  {% endblock %}
  ```

  （登录、404、user bar 都可以覆写 `branding_logo`。([Wagtail Documentation][1]))

- **Favicon**：覆写 `branding_favicon`
  `crm_branding/templates/wagtailadmin/admin_base.html`

  ```django
  {% extends "wagtailadmin/admin_base.html" %}
  {% load static %}
  {% block branding_favicon %}
    <link rel="shortcut icon" href="{% static 'images/crm-favicon.ico' %}" />
  {% endblock %}
  ```

  （文档明确此块用于替换后台 Favicon。([Wagtail Documentation][1]))

- **标题前缀**（默认是 “Wagtail”）
  同一文件再加：

  ```django
  {% block branding_title %}CRM Admin{% endblock %}
  ```

  （`branding_title` 用于替换标题前缀。([Wagtail Documentation][1]))

---

# 仅在“CRM 后台”显示不同 logo 的做法

如果你的项目既有 CMS 后台又有 CRM 后台，希望**不同入口显示不同 logo**，有两种常见路径：

**A. 基于站点/根页面名分支（多站点/多租场景）**
Wagtail 在后台模板上下文里提供了 `site_name` 等变量，可用于条件渲染：

```django
{% extends "wagtailadmin/base.html" %}
{% load static %}
{% block branding_logo %}
  {% if site_name and "CRM" in site_name %}
    <img src="{% static 'images/crm-logo.svg' %}" alt="CRM Admin" width="96" />
  {% else %}
    <img src="{% static 'images/cms-logo.svg' %}" alt="CMS Admin" width="96" />
  {% endif %}
{% endblock %}
```

（`site_name`/`root_site` 可直接在模板使用，适合多站点后台区分品牌。([Wagtail Documentation][1]))

**B. 基于 URL 前缀分支**
如果你把 Wagtail admin 挂在不同前缀（如 `/crm-admin/`、`/cms-admin/`），也可以在模板用 `request.path` 判断（Wagtail 管理模板中可访问 `request`）：

```django
{% if request.path|startswith:"/crm-admin/" %}
  <!-- CRM logo -->
{% else %}
  <!-- CMS logo -->
{% endif %}
```

> 两种方式都无需改动 Wagtail 核心，只在你自己的 app 模板里控制。

---

# 颜色与主题（可搭配）

若你还想统一后台主色调（深/浅色主题都生效），用 hook 注入全局 CSS 覆盖变量即可：

```python
# crm_branding/wagtail_hooks.py
from wagtail import hooks
from django.templatetags.static import static

@hooks.register("insert_global_admin_css")
def add_admin_css():
    return f'<link rel="stylesheet" href="{static("css/crm-admin.css")}">'
```

`static/css/crm-admin.css`：

```css
:root {
  --w-color-primary-hue: 210; /* 统一主色相，示例为蓝调 */
}
```

（7.x 推荐通过 `insert_global_admin_css` + CSS 变量自定义 UI 颜色/密度。([Wagtail Documentation][1]))

---

# 常见坑位/校验清单

- **模板优先级**：承载你自定义模板的 app 必须在 `INSTALLED_APPS` 中**排在 `wagtail.admin` 之前**，否则不会生效。([Wagtail Documentation][1])
- **静态路径**：使用 `{% load static %}` + `{% static '...' %}`，生产环境别忘了 `collectstatic`。
- **SVG 适配暗色主题**：尽量别在 SVG 里硬编码深色填充；或在暗色模式下加反色版本。
- **登录页与 404**：如果希望一致体验，记得分别覆写 `wagtailadmin/login.html` 与 `wagtailadmin/404.html` 的 `branding_logo`。([Wagtail Documentation][1])

---

如果你把**CRM 和 CMS 的入口路径/站点名**发我（比如 `/crm-admin/`、`/admin/` 或具体 `site_name`），我可以直接给你**成套模板文件**（含条件分支），贴进去就能替换并区分两个后台的 logo。

[1]: https://docs.wagtail.org/en/v7.1/advanced_topics/customisation/admin_templates.html "Customizing admin templates — Wagtail Documentation 7.1 documentation"
