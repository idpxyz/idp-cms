/**
 * 更新北京站配置脚本
 * 通过API接口将北京站的主色调改为红色
 */

const CMS_API_BASE = "http://localhost:8000";
const SITE_ID = "beijing";

// 北京站红色主题配置
const beijingRedConfig = {
  // 主色调改为红色
  primary_color: "#DC2626", // 北京红

  // 品牌令牌配置
  brand_tokens: {
    primary: "#DC2626", // 主色调：北京红
    secondary: "#7F1D1D", // 辅助色：深红色
    accent: "#EF4444", // 强调色：亮红色
    background: "#FFFFFF", // 背景色：白色
    surface: "#FEF2F2", // 表面色：浅红色背景
    error: "#DC2626", // 错误色：红色
    warning: "#F59E0B", // 警告色：黄色
    success: "#059669", // 成功色：绿色
    info: "#0EA5E9", // 信息色：蓝色

    // 文本颜色
    "text-primary": "#1F2937", // 主要文本：深灰色
    "text-secondary": "#6B7280", // 次要文本：中灰色
    "text-muted": "#9CA3AF", // 静默文本：浅灰色
    "text-inverse": "#FFFFFF", // 反色文本：白色

    // 间距令牌
    "spacing-xs": "0.25rem",
    "spacing-sm": "0.5rem",
    "spacing-md": "1rem",
    "spacing-lg": "1.5rem",
    "spacing-xl": "2rem",
    "spacing-2xl": "3rem",

    // 字体令牌
    "font-family-base": "'Noto Sans SC', 'Inter', system-ui, sans-serif",
    "font-family-heading": "'Noto Serif SC', 'Georgia', serif",
    "font-family-mono": "'JetBrains Mono', monospace",

    // 字号令牌
    "font-size-xs": "0.75rem",
    "font-size-sm": "0.875rem",
    "font-size-base": "1rem",
    "font-size-lg": "1.125rem",
    "font-size-xl": "1.25rem",
    "font-size-2xl": "1.5rem",
    "font-size-3xl": "1.875rem",

    // 圆角令牌
    "radius-sm": "0.125rem",
    "radius-md": "0.375rem",
    "radius-lg": "0.5rem",
    "radius-xl": "0.75rem",
    "radius-full": "9999px",
  },

  // 模块配置
  modules: {
    home: ["local-hero", "local-news", "local-events", "local-features"],
    sidebar: ["weather", "services", "contact", "trending"],
    header: ["navigation", "search", "user-menu"],
    footer: ["links", "social", "newsletter", "copyright"],
  },

  // 主题配置
  theme_key: "localsite-beijing",
  theme_version: "1.0.0",
  layout_key: "layout-beijing-classic",

  // 品牌信息
  brand_name: "北京新闻资讯",
  default_title: "北京新闻资讯 - 了解北京最新动态",
  default_description:
    "了解北京最新动态，掌握首都发展脉搏，关注北京城市建设、经济发展、文化传承等全方位资讯。",

  // 性能配置
  cache_timeout: 300, // 5分钟缓存

  // 元数据
  customized: true,
  is_production: false,
};

/**
 * 更新站点配置
 */
async function updateBeijingConfig() {
  try {
    console.log("🔄 开始更新北京站配置...");

    // 首先获取当前配置
    console.log("📡 获取当前配置...");
    const getResponse = await fetch(
      `${CMS_API_BASE}/api/site-settings?site=${SITE_ID}`
    );

    if (!getResponse.ok) {
      throw new Error(
        `获取配置失败: ${getResponse.status} ${getResponse.statusText}`
      );
    }

    const currentConfig = await getResponse.json();
    console.log("✅ 当前配置获取成功");

    // 准备更新数据
    const updateData = {
      ...currentConfig.settings, // 保留现有配置
      ...beijingRedConfig, // 应用红色主题配置
    };

    console.log("🎨 应用红色主题配置...");
    console.log("主色调:", updateData.primary_color);
    console.log("品牌令牌:", updateData.brand_tokens.primary);

    // 发送更新请求
    console.log("📤 发送更新请求...");
    const updateResponse = await fetch(
      `${CMS_API_BASE}/api/site-settings/${SITE_ID}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `更新配置失败: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`
      );
    }

    const result = await updateResponse.json();
    console.log("✅ 北京站红色主题配置更新成功！");
    console.log("📊 更新结果:", JSON.stringify(result, null, 2));

    // 验证更新
    console.log("🔍 验证更新结果...");
    const verifyResponse = await fetch(
      `${CMS_API_BASE}/api/site-settings?site=${SITE_ID}`
    );
    const verifyConfig = await verifyResponse.json();

    console.log("🎯 验证结果:");
    console.log("主色调:", verifyConfig.settings.primary_color);
    console.log("品牌令牌主色:", verifyConfig.settings.brand_tokens.primary);

    if (verifyConfig.settings.primary_color === "#DC2626") {
      console.log("🎉 北京站红色主题配置验证成功！");
    } else {
      console.log("⚠️  配置可能未完全更新，请检查");
    }
  } catch (error) {
    console.error("❌ 更新配置失败:", error.message);

    // 尝试使用POST方法创建新配置
    console.log("🔄 尝试使用POST方法创建配置...");
    try {
      const createResponse = await fetch(`${CMS_API_BASE}/api/site-settings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          site: SITE_ID,
          ...beijingRedConfig,
        }),
      });

      if (createResponse.ok) {
        console.log("✅ 使用POST方法成功创建北京站红色主题配置！");
      } else {
        console.error(
          "❌ POST方法也失败了:",
          createResponse.status,
          createResponse.statusText
        );
      }
    } catch (createError) {
      console.error("❌ POST方法失败:", createError.message);
    }
  }
}

/**
 * 测试配置是否生效
 */
async function testBeijingConfig() {
  try {
    console.log("🧪 测试北京站配置...");

    const response = await fetch(
      `${CMS_API_BASE}/api/site-settings?site=${SITE_ID}`
    );
    if (response.ok) {
      const config = await response.json();
      console.log("🎨 当前配置:");
      console.log("主色调:", config.settings.primary_color);
      console.log("品牌令牌:", config.settings.brand_tokens.primary);
      console.log("主题键:", config.settings.theme_key);
    }
  } catch (error) {
    console.error("测试失败:", error.message);
  }
}

// 执行更新
if (require.main === module) {
  updateBeijingConfig()
    .then(() => {
      console.log("✅ 脚本执行完成");
      return testBeijingConfig();
    })
    .catch(console.error);
}

module.exports = { updateBeijingConfig, testBeijingConfig, beijingRedConfig };
