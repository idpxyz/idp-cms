OK，我们把 **Wagtail 7.1.1 登录页做“完全定制”**，同时保持**官方兼容**（不改核心、不破坏升级）。按“最小可行 → 逐步增强”的方式给你一套可直接落地的结构和代码。

---

# 0）准备：放置自定义模板的 app 与顺序

创建/选择一个用于品牌化的 app（例如 `crm_branding`），并**确保它在 `INSTALLED_APPS` 中排在 `wagtail.admin` 之前**，这样你的模板才能覆盖官方模板：

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "crm_branding",   # 必须出现在 wagtail.admin 之前
    "wagtail",
    "wagtail.admin",
    # ...
]
```

> 官方建议：在你的 app 下建 `templates/wagtailadmin/`，用于覆盖后台模板块。([Wagtail Documentation][1])

---

# 1）“外观完全可控”的模板骨架（登录页）

在 `crm_branding/templates/wagtailadmin/login.html` 新建文件，用**官方暴露的模板块**来定制**文案、Logo、表单布局、按钮**等（所有块名均为 7.1 文档所述）：

```django
{# crm_branding/templates/wagtailadmin/login.html #}
{% extends "wagtailadmin/login.html" %}
{% load static i18n %}

{# 1. 左上角 Logo（登录页也可单独替换） #}
{% block branding_logo %}
  <img src="{% static 'images/crm-logo.svg' %}" alt="CRM Admin" width="140" height="40" />
{% endblock %}

{# 2. 登录标题文案（输入框上方那一行） #}
{% block branding_login %}{% trans "登录 CRM 后台" %}{% endblock %}

{# 3. 登录表单上/下方可插入提示、公告、链接 #}
{% block above_login %}
  <div class="crm-login-note">
    仅限内部员工使用。遇到问题请联系 IT 支持。
  </div>
{% endblock %}

{# 4. 完整自定义 <form>（想 100% 控制就覆写 login_form；想保持字段由官方渲染，则覆写 fields 并 {{ block.super }}） #}
{% block login_form %}
  <form action="{% url 'wagtailadmin_login' %}" method="post" novalidate class="crm-login-form">
    {% csrf_token %}
    <input type="hidden" name="next" value="{{ next }}"/>

    <ul class="fields">
      {# 4.1 字段区：保留用户名/密码的官方渲染，同时可加自定义字段 #}
      {% block fields %}
        {{ block.super }}  {# 必须：包含用户名/密码等默认字段 #}
        <li class="field checkbox">
          <label><input type="checkbox" name="remember_me"> {% trans "保持登录" %}</label>
        </li>
      {% endblock %}
    </ul>

    {# 4.2 提交按钮区：可添加/替换按钮，但若要保留默认“登录”按钮需包含 {{ block.super }} #}
    {% block submit_buttons %}
      {{ block.super }}
      <a class="button button-secondary" href="/accounts/sso/login/">
        {% trans "使用 SSO 登录" %}
      </a>
    {% endblock %}
  </form>
{% endblock %}
```

- 上面用到的块名 `branding_logo / branding_login / above_login / fields / submit_buttons / login_form` 都来自 **Wagtail 7.1 官方“Customizing admin templates”**，并明确支持这几种定制粒度；`login_form` 可**包住整个 `<form>`**，实现“完全可控”。([Wagtail Documentation][1])

---

# 2）样式彻底自定义（不改核心 CSS）

用 hook 给后台**全局注入你的 CSS**，控制登录页背景、卡片、暗色模式等：

```python
# crm_branding/wagtail_hooks.py
from wagtail import hooks
from django.templatetags.static import static
from django.utils.html import format_html

@hooks.register("insert_global_admin_css")
def add_admin_css():
    return format_html('<link rel="stylesheet" href="{}">', static("css/crm-admin.css"))
```

> `insert_global_admin_css` 是官方提供的后台全局 CSS 注入入口。([Wagtail Documentation][2])

在 `crm_branding/static/css/crm-admin.css` 加你自己的样式（示例）：

```css
/* 登录页背景、卡片布局示例 —— 仅示意，按你的设计改 */
body.wagtail-admin .content-wrapper {
  min-height: 100vh;
}
.crm-login-note {
  margin-bottom: 12px;
  opacity: 0.8;
}

/* 颜色/密度可通过 Wagtail 暴露的 CSS 变量统一调整（支持明暗两套） */
:root,
.w-theme-light {
  --w-color-primary: #165dff; /* 改品牌主色 */
}
.w-theme-dark {
  --w-color-primary: #3a7bfd;
}

/* 进一步自定义密度（全局）：默认 1，紧凑可调 0.8 / 0.5 */
:root {
  --w-density-factor: 0.9;
}
```

> 官方推荐：通过注入 CSS 并设置 `:root` 变量来自定义**颜色**与**信息密度**，明/暗主题均可覆盖。([Wagtail Documentation][1])

---

# 3）登录相关的其它官方可定制点

- **标题前缀 / Favicon（浏览器标签）**
  在 `templates/wagtailadmin/admin_base.html` 覆写：

  ```django
  {% extends "wagtailadmin/admin_base.html" %}
  {% load static %}
  {% block branding_title %}CRM Admin{% endblock %}
  {% block branding_favicon %}
    <link rel="shortcut icon" href="{% static 'images/crm-favicon.ico' %}" />
  {% endblock %}
  ```

  （块名 `branding_title / branding_favicon` 为官方提供）([Wagtail Documentation][1])

- **登录页 Logo 也可单独替换**（不影响其它页面）
  只在 `wagtailadmin/login.html` 覆写 `branding_logo` 即可。([Wagtail Documentation][1])

- **密码重置页面也能定制**
  覆写 `templates/wagtailadmin/account/password_reset/form.html` 的 `above_form / below_form / submit_buttons` 等块。([Wagtail Documentation][1])

---

# 4）“保持登录（Remember me）”的功能实现（可选）

上面模板只是加了复选框。要真正生效，可在登录后设置会话寿命（不改 Wagtail 核心）：

```python
# 方式一：轻量中间件（示例）
class AdminRememberMeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        response = self.get_response(request)
        # 仅在 admin 登录 POST 成功后标记的请求上调整会话寿命
        if request.path.endswith("/admin/login/") and request.method == "POST":
            if request.POST.get("remember_me"):
                # 例如 14 天
                request.session.set_expiry(60 * 60 * 24 * 14)
            else:
                # 浏览器会话
                request.session.set_expiry(0)
        return response
```

把中间件放到 `MIDDLEWARE` 末尾，或你自定义的登录 view 中处理。模板层添加字段是**官方支持**，会话控制属于标准 Django 能力。模板加字段：`fields` / `login_form` 参考官方块名。([Wagtail Documentation][1])

---

# 5）加入 SSO / 第三方登录按钮（可选）

在 `submit_buttons` 中增加一个按钮（上面已有示例），指向你的 SSO 登录 URL（如 `/accounts/sso/login/` 或你集成的 provider 的 `url` 名称）。

> `submit_buttons` 用于在默认“登录”按钮旁**添加自定义按钮**；若想保留默认按钮，应包含 `{{ block.super }}`。([Wagtail Documentation][1])

---

# 6）多站点/多入口显示不同品牌（可选）

Wagtail 在后台模板上下文里提供 `site_name / root_site` 等变量，你可以按站点名切换不同 Logo/文案，例如：

```django
{% block branding_login %}
  {% if site_name and "CRM" in site_name %}
    登录 CRM 后台
  {% else %}
    登录 CMS 后台
  {% endif %}
{% endblock %}
```

> 这些上下文变量用于多租户/多站点的品牌差异化。([Wagtail Documentation][1])

---

# 7）发版检查清单

- `crm_branding` 在 `INSTALLED_APPS` 中位置正确（在 `wagtail.admin` 之前）。([Wagtail Documentation][1])
- 静态资源路径用 `{% static %}`；生产环境执行 `collectstatic`。
- 样式通过 `insert_global_admin_css` 注入（不要改官方静态文件）。([Wagtail Documentation][2])
- 自定义块名与文档一致（`branding_*`、`above_login`、`fields`、`submit_buttons`、`login_form`）。([Wagtail Documentation][1])

---

## 你可以直接拷贝这几份文件开始改

- `crm_branding/templates/wagtailadmin/login.html`（上方示例）
- `crm_branding/templates/wagtailadmin/admin_base.html`（标题+favicon）
- `crm_branding/wagtail_hooks.py`（注入 CSS）
- `crm_branding/static/css/crm-admin.css`（你的视觉风格）

需要我把**成套模板+CSS**按你现有的品牌色、Logo、是否带 SSO/Remember me**生成一份可直接放进项目的压缩包**吗？我也可以顺手把**暗色模式 Logo 替换**（`.w-theme-dark`）和**登录背景**配好。

[1]: https://docs.wagtail.org/en/v7.1/advanced_topics/customisation/admin_templates.html "Customizing admin templates — Wagtail Documentation 7.1 documentation"
[2]: https://docs.wagtail.org/en/stable/reference/hooks.html "Hooks — Wagtail Documentation 7.1.1 documentation"
