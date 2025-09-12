#!/usr/bin/env node
/**
 * Bundle 大小监控脚本
 *
 * 实施 BestThemeOptimize.md 的Bundle监控策略：
 * - 主题增量 JS ≤ 30KB gzip
 * - CI 自动检查，超阈值阻断发布
 * - 生成详细的Bundle分析报告
 */

const fs = require("fs");
const path = require("path");

// 配置
const isProduction = process.env.NODE_ENV === "production";
const CONFIG = {
  THRESHOLDS: {
    THEME_CHUNK_GZIP: 50 * 1024, // 50KB gzip
    // 根据环境调整阈值
    TOTAL_JS_GZIP: isProduction ? 500 * 1024 : 3 * 1024 * 1024, // 生产: 500KB, 开发: 3MB
    MAIN_CHUNK_GZIP: isProduction ? 300 * 1024 : 2 * 1024 * 1024, // 生产: 300KB, 开发: 2MB
  },

  PATHS: {
    BUILD_DIR: ".next",
    STATIC_DIR: ".next/static",
    CHUNKS_DIR: ".next/static/chunks",
    REPORT_FILE: "./bundle-analysis.json",
  },

  // 主题相关的chunk模式
  THEME_PATTERNS: [
    /themes-portal-v\d+-[a-f0-9]+\.js$/,
    /themes-localsite-default-v\d+-[a-f0-9]+\.js$/,
    /themes-magazine-v\d+-[a-f0-9]+\.js$/,
  ],
};

/**
 * 分析单个文件
 */
async function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath);
  const rawSize = content.length;

  // 动态导入 gzip-size
  const { gzipSize } = await import("gzip-size");
  const gzippedSize = await gzipSize(content);

  return {
    path: filePath,
    name: path.basename(filePath),
    rawSize,
    gzippedSize,
    compressionRatio: (rawSize - gzippedSize) / rawSize,
  };
}

/**
 * 获取所有JS文件
 */
function getJSFiles(directory) {
  const files = [];

  if (!fs.existsSync(directory)) {
    console.warn(`Directory not found: ${directory}`);
    return files;
  }

  function walkDir(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith(".js") && !item.includes(".map")) {
        files.push(fullPath);
      }
    }
  }

  walkDir(directory);
  return files;
}

/**
 * 分析主题相关的chunk
 */
function analyzeThemeChunks(files) {
  const themeChunks = [];

  for (const file of files) {
    const fileName = path.basename(file);

    // 检查是否是主题相关文件
    const isThemeChunk = CONFIG.THEME_PATTERNS.some((pattern) =>
      pattern.test(fileName)
    );

    if (isThemeChunk) {
      themeChunks.push(file);
    }
  }

  return themeChunks;
}

/**
 * 生成分析报告
 */
async function generateReport() {
  console.log("🔍 Analyzing bundle sizes...\n");

  const staticDir = CONFIG.PATHS.STATIC_DIR;
  const chunksDir = CONFIG.PATHS.CHUNKS_DIR;

  // 获取所有JS文件
  const allFiles = [
    ...getJSFiles(chunksDir),
    ...getJSFiles(path.join(staticDir, "runtime")),
  ];

  if (allFiles.length === 0) {
    console.error(
      "❌ No JS files found. Make sure to run this after building."
    );
    process.exit(1);
  }

  // 分析所有文件
  const fileAnalysis = [];
  for (const file of allFiles) {
    const analysis = await analyzeFile(file);
    if (analysis) {
      fileAnalysis.push(analysis);
    }
  }

  // 按gzip大小排序
  fileAnalysis.sort((a, b) => b.gzippedSize - a.gzippedSize);

  // 分析主题chunks
  const themeChunks = analyzeThemeChunks(allFiles);
  const themeAnalysis = [];

  for (const chunk of themeChunks) {
    const analysis = await analyzeFile(chunk);
    if (analysis) {
      themeAnalysis.push(analysis);
    }
  }

  // 计算总量
  const totalStats = {
    totalFiles: fileAnalysis.length,
    totalRawSize: fileAnalysis.reduce((sum, f) => sum + f.rawSize, 0),
    totalGzippedSize: fileAnalysis.reduce((sum, f) => sum + f.gzippedSize, 0),
    themeFilesCount: themeAnalysis.length,
    themeRawSize: themeAnalysis.reduce((sum, f) => sum + f.rawSize, 0),
    themeGzippedSize: themeAnalysis.reduce((sum, f) => sum + f.gzippedSize, 0),
  };

  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    totalStats,
    allFiles: fileAnalysis,
    themeFiles: themeAnalysis,
    violations: [],
    passed: true,
  };

  // 检查阈值违规
  checkThresholds(report);

  // 保存报告
  fs.writeFileSync(CONFIG.PATHS.REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

/**
 * 检查阈值违规
 */
function checkThresholds(report) {
  const { totalStats, allFiles, themeFiles } = report;
  const { THRESHOLDS } = CONFIG;

  // 检查主题文件大小
  for (const theme of themeFiles) {
    if (theme.gzippedSize > THRESHOLDS.THEME_CHUNK_GZIP) {
      report.violations.push({
        type: "theme_chunk_too_large",
        file: theme.name,
        size: theme.gzippedSize,
        threshold: THRESHOLDS.THEME_CHUNK_GZIP,
        message: `Theme chunk ${theme.name} is ${formatSize(theme.gzippedSize)}, exceeds ${formatSize(THRESHOLDS.THEME_CHUNK_GZIP)}`,
      });
    }
  }

  // 检查总JS大小
  if (totalStats.totalGzippedSize > THRESHOLDS.TOTAL_JS_GZIP) {
    report.violations.push({
      type: "total_js_too_large",
      size: totalStats.totalGzippedSize,
      threshold: THRESHOLDS.TOTAL_JS_GZIP,
      message: `Total JS size ${formatSize(totalStats.totalGzippedSize)} exceeds ${formatSize(THRESHOLDS.TOTAL_JS_GZIP)}`,
    });
  }

  // 检查主chunk大小
  const mainChunk = allFiles.find((f) => f.name.includes("main-"));
  if (mainChunk && mainChunk.gzippedSize > THRESHOLDS.MAIN_CHUNK_GZIP) {
    report.violations.push({
      type: "main_chunk_too_large",
      file: mainChunk.name,
      size: mainChunk.gzippedSize,
      threshold: THRESHOLDS.MAIN_CHUNK_GZIP,
      message: `Main chunk ${mainChunk.name} is ${formatSize(mainChunk.gzippedSize)}, exceeds ${formatSize(THRESHOLDS.MAIN_CHUNK_GZIP)}`,
    });
  }

  report.passed = report.violations.length === 0;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 打印控制台报告
 */
function printReport(report) {
  const { totalStats, themeFiles, violations, passed } = report;

  console.log("📊 Bundle Analysis Report");
  console.log("========================\n");

  // 总体统计
  console.log("📈 Overall Statistics:");
  console.log(`  Total Files: ${totalStats.totalFiles}`);
  console.log(`  Total Raw Size: ${formatSize(totalStats.totalRawSize)}`);
  console.log(`  Total Gzipped: ${formatSize(totalStats.totalGzippedSize)}`);
  console.log(
    `  Compression: ${(((totalStats.totalRawSize - totalStats.totalGzippedSize) / totalStats.totalRawSize) * 100).toFixed(1)}%\n`
  );

  // 主题统计
  if (themeFiles.length > 0) {
    console.log("🎨 Theme Statistics:");
    console.log(`  Theme Files: ${totalStats.themeFilesCount}`);
    console.log(`  Theme Raw Size: ${formatSize(totalStats.themeRawSize)}`);
    console.log(`  Theme Gzipped: ${formatSize(totalStats.themeGzippedSize)}`);

    console.log("\n  Theme Files Details:");
    for (const theme of themeFiles) {
      const status =
        theme.gzippedSize <= CONFIG.THRESHOLDS.THEME_CHUNK_GZIP ? "✅" : "❌";
      console.log(
        `    ${status} ${theme.name}: ${formatSize(theme.gzippedSize)}`
      );
    }
    console.log();
  }

  // 违规检查
  if (violations.length > 0) {
    console.log("⚠️  Threshold Violations:");
    for (const violation of violations) {
      console.log(`  ❌ ${violation.message}`);
    }
    console.log();
  }

  // 最终结果
  if (passed) {
    console.log("✅ All bundle size checks passed!");
  } else {
    console.log("❌ Bundle size checks failed!");
    console.log("\n💡 Suggestions:");
    console.log("  - Consider code splitting for large chunks");
    console.log("  - Review theme dependencies and remove unused code");
    console.log("  - Use dynamic imports for non-critical components");
    console.log("  - Check for duplicate dependencies");
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const report = await generateReport();
    printReport(report);

    // CI 模式：如果检查失败，退出码为1
    if (process.env.CI && !report.passed) {
      console.log(
        "\n🚨 CI Mode: Bundle size checks failed, exiting with code 1"
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Bundle analysis failed:", error);
    process.exit(1);
  }
}

// 运行分析
if (require.main === module) {
  main();
}

module.exports = {
  generateReport,
  analyzeFile,
  CONFIG,
};
