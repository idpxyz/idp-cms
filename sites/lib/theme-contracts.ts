/**
 * 主题契约测试系统
 *
 * 实施 BestThemeOptimize.md 的契约测试策略：
 * - 定义主题/布局/模块的TypeScript接口
 * - 提供契约测试工具
 * - 确保主题间兼容性
 */

import { ReactNode, ComponentType } from "react";
import { BrandTokens, Modules } from "./schemas";

/**
 * 主题元数据契约
 */
export interface ThemeContract {
  key: string;
  version: string;
  name: string;
  description: string;
  tokens: (siteTokens?: Partial<BrandTokens>) => BrandTokens;
  layouts: Record<string, () => Promise<{ default: ComponentType<any> }>>;
  components?: Record<string, () => Promise<{ default: ComponentType<any> }>>;
}

/**
 * 布局组件契约
 */
export interface LayoutContract {
  // 必须接受 children
  (props: LayoutProps): JSX.Element;
}

export interface LayoutProps {
  children: ReactNode;
  // 可选的布局特定 props
  className?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

/**
 * 模块组件契约
 */
export interface ModuleContract {
  // 模块组件的基础接口
  (props: ModuleProps): JSX.Element;
}

export interface ModuleProps {
  // 基础 props
  className?: string;
  // 模块可能接收的数据
  data?: any;
  // 配置参数
  config?: Record<string, any>;
  // 主题令牌访问
  tokens?: BrandTokens;
}

/**
 * 站点设置契约
 */
export interface SiteSettingsContract {
  theme_key: string;
  theme_version: string;
  layout_key: string;
  brand_tokens: BrandTokens;
  modules: Modules;
  customized: boolean;
  // 其他必需字段
  site_name: string;
  hostname: string;
  cache_timeout: number;
}

/**
 * 主题加载器契约
 */
export interface ThemeLoaderContract {
  loadTheme(
    themeKey: string,
    themeVersion?: string,
    host?: string
  ): Promise<ThemeContract>;
  pickLayout(
    theme: ThemeContract,
    layoutKey: string,
    host: string
  ): Promise<ComponentType<LayoutProps>>;
  getThemeConfig(
    themeKey: string,
    themeVersion?: string,
    layoutKey?: string,
    host?: string
  ): Promise<any>;
}

/**
 * 契约验证器
 */
export class ContractValidator {
  /**
   * 验证主题元数据契约
   */
  static validateTheme(theme: any): theme is ThemeContract {
    const required = [
      "key",
      "version",
      "name",
      "description",
      "tokens",
      "layouts",
    ];

    for (const field of required) {
      if (!(field in theme)) {
        console.error(`Theme contract violation: missing field '${field}'`);
        return false;
      }
    }

    // 验证 tokens 函数
    if (typeof theme.tokens !== "function") {
      console.error("Theme contract violation: tokens must be a function");
      return false;
    }

    // 验证 layouts 对象
    if (typeof theme.layouts !== "object" || theme.layouts === null) {
      console.error("Theme contract violation: layouts must be an object");
      return false;
    }

    // 验证版本格式
    if (!/^\d+\.\d+\.\d+$/.test(theme.version)) {
      console.error(
        `Theme contract violation: invalid version format '${theme.version}'`
      );
      return false;
    }

    return true;
  }

  /**
   * 验证布局组件契约
   */
  static validateLayout(Layout: any): Layout is ComponentType<LayoutProps> {
    if (typeof Layout !== "function") {
      console.error("Layout contract violation: must be a React component");
      return false;
    }

    // 可以添加更多运行时检查
    return true;
  }

  /**
   * 验证模块组件契约
   */
  static validateModule(Module: any): Module is ComponentType<ModuleProps> {
    if (typeof Module !== "function") {
      console.error("Module contract violation: must be a React component");
      return false;
    }

    return true;
  }

  /**
   * 验证站点设置契约
   */
  static validateSiteSettings(settings: any): settings is SiteSettingsContract {
    const required = [
      "theme_key",
      "theme_version",
      "layout_key",
      "brand_tokens",
      "modules",
      "customized",
      "site_name",
      "hostname",
      "cache_timeout",
    ];

    for (const field of required) {
      if (!(field in settings)) {
        console.error(
          `SiteSettings contract violation: missing field '${field}'`
        );
        return false;
      }
    }

    return true;
  }
}

/**
 * 契约测试工具
 */
export class ContractTester {
  private errors: string[] = [];

  /**
   * 测试主题契约
   */
  async testTheme(
    themeKey: string,
    themeVersion: string = "1.0.0"
  ): Promise<boolean> {
    this.errors = [];

    try {
      // 动态导入主题
      const { ThemeRegistry, resolveVersion, isValidThemeKey } = await import(
        "./theme-registry"
      );

      if (!isValidThemeKey(themeKey)) {
        this.errors.push(`Invalid theme key: ${themeKey}`);
        return false;
      }

      const version = resolveVersion(themeKey as any, themeVersion);
      const themeModule =
        await ThemeRegistry[themeKey as keyof typeof ThemeRegistry][version]();

      if (!themeModule?.meta) {
        this.errors.push(`Theme module does not export meta`);
        return false;
      }

      // 验证主题契约
      if (!ContractValidator.validateTheme(themeModule.meta)) {
        this.errors.push(`Theme contract validation failed`);
        return false;
      }

      // 测试令牌生成器
      try {
        const tokens = themeModule.meta.tokens();
        if (typeof tokens !== "object" || tokens === null) {
          this.errors.push(`Theme tokens generator must return an object`);
          return false;
        }
      } catch (error) {
        this.errors.push(`Theme tokens generator failed: ${error}`);
        return false;
      }

      // 测试布局加载
      const layoutKeys = Object.keys(themeModule.meta.layouts);
      for (const layoutKey of layoutKeys.slice(0, 2)) {
        // 测试前两个布局
        try {
          const layoutModule = await themeModule.meta.layouts[layoutKey]();
          if (!ContractValidator.validateLayout(layoutModule.default)) {
            this.errors.push(
              `Layout '${layoutKey}' contract validation failed`
            );
            return false;
          }
        } catch (error) {
          this.errors.push(`Failed to load layout '${layoutKey}': ${error}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.errors.push(`Theme test failed: ${error}`);
      return false;
    }
  }

  /**
   * 测试主题兼容性
   */
  async testThemeCompatibility(
    oldThemeKey: string,
    newThemeKey: string,
    oldVersion: string = "1.0.0",
    newVersion: string = "1.0.0"
  ): Promise<boolean> {
    this.errors = [];

    try {
      const oldPassed = await this.testTheme(oldThemeKey, oldVersion);
      const newPassed = await this.testTheme(newThemeKey, newVersion);

      if (!oldPassed || !newPassed) {
        this.errors.push(`Basic theme validation failed`);
        return false;
      }

      // 可以添加更多兼容性检查
      // 比如检查令牌结构是否兼容、布局接口是否一致等

      return true;
    } catch (error) {
      this.errors.push(`Compatibility test failed: ${error}`);
      return false;
    }
  }

  /**
   * 获取测试错误
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * 打印测试报告
   */
  printReport(testName: string, passed: boolean): void {
    console.log(`\n📋 Contract Test: ${testName}`);
    console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"}`);

    if (!passed && this.errors.length > 0) {
      console.log("Errors:");
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  }
}

/**
 * 内置契约测试套件
 */
export class ContractTestSuite {
  private tester = new ContractTester();

  /**
   * 运行所有契约测试
   */
  async runAll(): Promise<boolean> {
    console.log("🧪 Running Theme Contract Tests...\n");

    const tests: Array<{ name: string; test: () => Promise<boolean> }> = [
      {
        name: "Portal Theme v1",
        test: () => this.tester.testTheme("portal", "1.0.0"),
      },
      {
        name: "LocalSite Default Theme v1",
        test: () => this.tester.testTheme("localsite-default", "1.0.0"),
      },
      {
        name: "Magazine Theme v2",
        test: () => this.tester.testTheme("magazine", "2.0.0"),
      },
      {
        name: "Portal vs LocalSite Compatibility",
        test: () =>
          this.tester.testThemeCompatibility("portal", "localsite-default"),
      },
    ];

    let allPassed = true;

    for (const { name, test } of tests) {
      const passed = await test();
      this.tester.printReport(name, passed);

      if (!passed) {
        allPassed = false;
      }
    }

    console.log(
      `\n📊 Contract Tests Summary: ${allPassed ? "✅ ALL PASSED" : "❌ SOME FAILED"}`
    );
    return allPassed;
  }
}

/**
 * 导出默认测试实例
 */
export const contractTestSuite = new ContractTestSuite();
export const contractTester = new ContractTester();
