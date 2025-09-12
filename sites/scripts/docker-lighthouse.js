#!/usr/bin/env node
/**
 * Docker 环境下的 Lighthouse 性能测试脚本
 *
 * 针对容器化环境优化的性能基线测试
 */

import lighthouse from "lighthouse";
import chromeLauncher from "chrome-launcher";
import fs from "fs";
import path from "path";

// Docker 环境配置
const CONFIG = {
  THRESHOLDS: {
    PERFORMANCE: 75, // 性能评分阈值
    LCP_MOBILE: 2500, // 移动端 LCP < 2.5s
    LCP_DESKTOP: 1500, // 桌面端 LCP < 1.5s
    FID: 100, // First Input Delay < 100ms
    CLS: 0.1, // Cumulative Layout Shift < 0.1
    TOTAL_JS_SIZE: 250000, // 总JS大小 < 250KB
  },

  // Docker 环境下的测试 URL（容器间通信）
  URLS: [
    process.env.TEST_BASE_URL || "http://web:3000", // Next.js 服务
    `${process.env.TEST_BASE_URL || "http://web:3000"}/portal`, // 门户首页
    `${process.env.TEST_BASE_URL || "http://web:3000"}/shanghai`, // 上海站首页
    `${process.env.TEST_BASE_URL || "http://web:3000"}/portal/theme-demo`, // 主题演示页
    `${process.env.TEST_BASE_URL || "http://web:3000"}/shanghai/theme-demo`, // 地方站演示页
  ],

  DEVICES: ["mobile", "desktop"],

  REPORTS_DIR: "./lighthouse-reports",
  SUMMARY_FILE: "./lighthouse-summary.json",

  // Docker 环境特定配置
  DOCKER: {
    HEADLESS: true,
    NO_SANDBOX: true,
    DISABLE_DEV_SHM: true,
    NETWORK: process.env.DOCKER_NETWORK || "bridge",
  },
};

/**
 * 检测 Docker 环境
 */
function isDockerEnvironment() {
  try {
    // 检查是否在容器中
    return (
      fs.existsSync("/.dockerenv") ||
      (fs.existsSync("/proc/self/cgroup") &&
        fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker"))
    );
  } catch {
    return false;
  }
}

/**
 * 等待服务就绪
 */
async function waitForService(url, maxRetries = 30, interval = 2000) {
  console.log(`🔄 等待服务就绪: ${url}`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ 服务就绪: ${url}`);
        return true;
      }
    } catch (error) {
      // 服务尚未就绪，继续等待
    }

    console.log(`⏳ 等待中... (${i + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`❌ 服务超时未就绪: ${url}`);
}

/**
 * 启动 Chrome 实例（Docker 优化）
 */
async function launchChrome() {
  const dockerFlags = [
    "--headless",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--allow-running-insecure-content",
    "--ignore-certificate-errors",
    "--ignore-ssl-errors",
    "--ignore-certificate-errors-spki-list",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
  ];

  // Docker 环境额外配置
  if (isDockerEnvironment()) {
    console.log("🐳 检测到 Docker 环境，应用容器优化配置");
    dockerFlags.push(
      "--memory-pressure-off",
      "--max_old_space_size=4096",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows"
    );
  }

  return await chromeLauncher.launch({
    chromeFlags: dockerFlags,
    logLevel: "info",
  });
}

/**
 * 运行 Lighthouse 审计（Docker 优化）
 */
async function runLighthouse(url, device, chrome) {
  const options = {
    logLevel: "info",
    output: "json",
    onlyCategories: ["performance"],
    port: chrome.port,
    settings: {
      // 设备仿真
      emulatedFormFactor: device,

      // Docker 环境下的网络模拟（相对宽松）
      throttling:
        device === "mobile"
          ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 2, // Docker 下降低 CPU 模拟倍数
              requestLatencyMs: 150 * 2,
              downloadThroughputKbps: 1638.4 * 0.9,
              uploadThroughputKbps: 675 * 0.9,
            }
          : {
              rttMs: 40,
              throughputKbps: 10240,
              cpuSlowdownMultiplier: 1,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            },

      // 禁用不必要的审计以提高稳定性
      skipAudits: [
        "unused-javascript",
        "unused-css-rules",
        "screenshot-thumbnails",
        "final-screenshot",
        "full-page-screenshot",
      ],

      // Docker 环境优化
      maxWaitForFcp: 30 * 1000, // 30s 超时
      maxWaitForLoad: 45 * 1000, // 45s 超时
      pauseAfterFcpMs: 1000, // FCP 后等待 1s
      pauseAfterLoadMs: 1000, // Load 后等待 1s
      networkQuietThresholdMs: 1000, // 网络静默阈值
      cpuQuietThresholdMs: 1000, // CPU 静默阈值
    },
  };

  console.log(`🔍 运行 Lighthouse: ${url} (${device}) [Docker 优化模式]`);

  try {
    const result = await lighthouse(url, options);
    return {
      url,
      device,
      timestamp: new Date().toISOString(),
      lhr: result.lhr,
      success: true,
      dockerEnv: isDockerEnvironment(),
    };
  } catch (error) {
    console.error(`❌ Lighthouse 失败: ${url} (${device}):`, error.message);
    return {
      url,
      device,
      timestamp: new Date().toISOString(),
      error: error.message,
      success: false,
      dockerEnv: isDockerEnvironment(),
    };
  }
}

/**
 * Docker 环境信息收集
 */
function getDockerInfo() {
  const info = {
    isDocker: isDockerEnvironment(),
    nodeEnv: process.env.NODE_ENV,
    testBaseUrl: process.env.TEST_BASE_URL,
    dockerNetwork: process.env.DOCKER_NETWORK,
  };

  try {
    if (fs.existsSync("/proc/meminfo")) {
      const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
      const memTotal = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
      if (memTotal) {
        info.memoryMB = Math.round(parseInt(memTotal[1]) / 1024);
      }
    }
  } catch (error) {
    // 忽略错误
  }

  return info;
}

/**
 * 主函数（Docker 优化）
 */
async function main() {
  console.log("🚀 启动 Docker 环境 Lighthouse CI 测试...\n");

  // 显示环境信息
  const dockerInfo = getDockerInfo();
  console.log("🐳 Docker 环境信息:");
  console.log(`   容器环境: ${dockerInfo.isDocker ? "✅" : "❌"}`);
  console.log(`   Node 环境: ${dockerInfo.nodeEnv || "development"}`);
  console.log(
    `   测试基础 URL: ${dockerInfo.testBaseUrl || "http://web:3000"}`
  );
  console.log(`   Docker 网络: ${dockerInfo.dockerNetwork || "bridge"}`);
  if (dockerInfo.memoryMB) {
    console.log(`   可用内存: ${dockerInfo.memoryMB}MB`);
  }
  console.log("");

  let chrome;

  try {
    // 等待 Next.js 服务就绪
    const baseUrl = CONFIG.URLS[0];
    await waitForService(baseUrl);

    // 启动 Chrome
    chrome = await launchChrome();
    console.log(`🌐 Chrome 启动成功 (端口: ${chrome.port})\n`);

    // 运行所有测试
    const results = [];

    for (const url of CONFIG.URLS) {
      for (const device of CONFIG.DEVICES) {
        const result = await runLighthouse(url, device, chrome);
        results.push(result);

        // 容器环境下增加等待时间
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 分析结果（复用原有逻辑）
    console.log("\n🔬 分析结果...\n");
    const analyses = results.map((result) => {
      if (!result.success || !result.lhr) {
        return {
          url: result.url,
          device: result.device,
          passed: false,
          error: result.error || "Unknown error",
          metrics: {},
          violations: ["Lighthouse audit failed"],
          dockerEnv: result.dockerEnv,
        };
      }

      const lhr = result.lhr;
      const audits = lhr.audits;

      const metrics = {
        performanceScore: Math.round(lhr.categories.performance.score * 100),
        lcp: audits["largest-contentful-paint"]?.numericValue || 0,
        fid: audits["max-potential-fid"]?.numericValue || 0,
        cls: audits["cumulative-layout-shift"]?.numericValue || 0,
        fcp: audits["first-contentful-paint"]?.numericValue || 0,
        ttfb: audits["server-response-time"]?.numericValue || 0,
      };

      const violations = [];
      const { THRESHOLDS } = CONFIG;

      if (metrics.performanceScore < THRESHOLDS.PERFORMANCE) {
        violations.push(
          `Performance score ${metrics.performanceScore} < ${THRESHOLDS.PERFORMANCE}`
        );
      }

      const lcpThreshold =
        result.device === "mobile"
          ? THRESHOLDS.LCP_MOBILE
          : THRESHOLDS.LCP_DESKTOP;
      if (metrics.lcp > lcpThreshold) {
        violations.push(
          `LCP ${metrics.lcp}ms > ${lcpThreshold}ms (${result.device})`
        );
      }

      return {
        url: result.url,
        device: result.device,
        timestamp: result.timestamp,
        passed: violations.length === 0,
        metrics,
        violations,
        dockerEnv: result.dockerEnv,
      };
    });

    // 打印报告
    const allPassed = printDockerReport(analyses, dockerInfo);

    // 保存报告
    saveDockerReports(analyses, dockerInfo);

    // CI 模式处理
    if (process.env.CI && !allPassed) {
      console.log("\n🚨 CI 模式: 性能测试失败，退出码 1");
      process.exit(1);
    }

    console.log("\n🎉 Docker Lighthouse CI 完成!");
  } catch (error) {
    console.error("❌ Docker Lighthouse CI 失败:", error);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
      console.log("🔚 Chrome 实例已关闭");
    }
  }
}

/**
 * 打印 Docker 优化的报告
 */
function printDockerReport(analyses, dockerInfo) {
  console.log("📊 Docker 环境 Lighthouse 性能报告");
  console.log("=====================================\n");

  let allPassed = true;

  for (const analysis of analyses) {
    const { url, device, passed, metrics, violations } = analysis;

    if (!passed) {
      allPassed = false;
    }

    const status = passed ? "✅" : "❌";
    console.log(`${status} ${url} (${device})`);

    if (metrics.performanceScore !== undefined) {
      console.log(`  Performance Score: ${metrics.performanceScore}/100`);
      console.log(`  LCP: ${(metrics.lcp / 1000).toFixed(2)}s`);
      console.log(`  FID: ${metrics.fid}ms`);
      console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
    }

    if (violations.length > 0) {
      console.log("  Violations:");
      violations.forEach((violation) => {
        console.log(`    • ${violation}`);
      });
    }

    console.log("");
  }

  console.log(`📈 总结: ${allPassed ? "✅ 全部通过" : "❌ 部分失败"}`);

  if (dockerInfo.isDocker) {
    console.log("\n🐳 Docker 环境说明:");
    console.log("  • 已应用容器环境优化配置");
    console.log("  • 网络延迟和 CPU 限制已调整");
    console.log("  • 建议在生产环境中进行最终验证");
  }

  return allPassed;
}

/**
 * 保存 Docker 报告
 */
function saveDockerReports(analyses, dockerInfo) {
  if (!fs.existsSync(CONFIG.REPORTS_DIR)) {
    fs.mkdirSync(CONFIG.REPORTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const detailFile = path.join(
    CONFIG.REPORTS_DIR,
    `lighthouse-docker-${timestamp}.json`
  );

  const report = {
    timestamp: new Date().toISOString(),
    environment: "docker",
    dockerInfo,
    analyses,
    summary: {
      totalTests: analyses.length,
      passedTests: analyses.filter((a) => a.passed).length,
      failedTests: analyses.filter((a) => a.passed === false).length,
    },
  };

  fs.writeFileSync(detailFile, JSON.stringify(report, null, 2));
  console.log(`📄 Docker 报告已保存: ${detailFile}`);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runLighthouse,
  isDockerEnvironment,
  CONFIG,
};
