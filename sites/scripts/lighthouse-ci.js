#!/usr/bin/env node
/**
 * Lighthouse 性能基线测试脚本
 * 
 * 实施 BestThemeOptimize.md 的性能基线策略：
 * - CI 跑 Lighthouse，阻断 LCP > 2.5s（移动）
 * - 生成性能报告和趋势分析
 * - 集成到构建流程中
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  THRESHOLDS: {
    PERFORMANCE: 75,        // 性能评分阈值
    LCP_MOBILE: 2500,      // 移动端 LCP < 2.5s
    LCP_DESKTOP: 1500,     // 桌面端 LCP < 1.5s
    FID: 100,              // First Input Delay < 100ms
    CLS: 0.1,              // Cumulative Layout Shift < 0.1
    TOTAL_JS_SIZE: 250000, // 总JS大小 < 250KB
  },
  
  URLS: [
    'http://localhost:3000',                    // 主页
    'http://localhost:3000/portal',             // 门户首页
    'http://localhost:3000/shanghai',           // 上海站首页
    'http://localhost:3000/portal/theme-demo',  // 主题演示页
    'http://localhost:3000/shanghai/theme-demo', // 地方站演示页
  ],
  
  DEVICES: ['mobile', 'desktop'],
  
  REPORTS_DIR: './lighthouse-reports',
  SUMMARY_FILE: './lighthouse-summary.json',
};

/**
 * 启动 Chrome 实例
 */
async function launchChrome() {
  return await chromeLauncher.launch({
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
    ]
  });
}

/**
 * 运行 Lighthouse 审计
 */
async function runLighthouse(url, device, chrome) {
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
    settings: {
      // 设备仿真
      emulatedFormFactor: device,
      throttling: device === 'mobile' ? {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 150 * 3.75,
        downloadThroughputKbps: 1638.4 * 0.9,
        uploadThroughputKbps: 675 * 0.9,
      } : {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
      // 禁用不需要的审计
      skipAudits: [
        'unused-javascript',
        'unused-css-rules',
        'screenshot-thumbnails',
        'final-screenshot',
      ],
    },
  };

  console.log(`🔍 Running Lighthouse for ${url} (${device})...`);
  
  try {
    const result = await lighthouse(url, options);
    return {
      url,
      device,
      timestamp: new Date().toISOString(),
      lhr: result.lhr,
      success: true,
    };
  } catch (error) {
    console.error(`❌ Lighthouse failed for ${url} (${device}):`, error.message);
    return {
      url,
      device,
      timestamp: new Date().toISOString(),
      error: error.message,
      success: false,
    };
  }
}

/**
 * 分析 Lighthouse 结果
 */
function analyzeLighthouseResult(result) {
  if (!result.success || !result.lhr) {
    return {
      url: result.url,
      device: result.device,
      passed: false,
      error: result.error || 'Unknown error',
      metrics: {},
      violations: ['Lighthouse audit failed'],
    };
  }

  const lhr = result.lhr;
  const audits = lhr.audits;
  
  // 提取关键指标
  const metrics = {
    performanceScore: Math.round(lhr.categories.performance.score * 100),
    lcp: audits['largest-contentful-paint']?.numericValue || 0,
    fid: audits['max-potential-fid']?.numericValue || 0,
    cls: audits['cumulative-layout-shift']?.numericValue || 0,
    fcp: audits['first-contentful-paint']?.numericValue || 0,
    ttfb: audits['server-response-time']?.numericValue || 0,
    totalJSSize: audits['unminified-javascript']?.details?.overallSavingsBytes || 0,
  };

  // 检查阈值违规
  const violations = [];
  const { THRESHOLDS } = CONFIG;
  
  if (metrics.performanceScore < THRESHOLDS.PERFORMANCE) {
    violations.push(`Performance score ${metrics.performanceScore} < ${THRESHOLDS.PERFORMANCE}`);
  }
  
  const lcpThreshold = result.device === 'mobile' ? THRESHOLDS.LCP_MOBILE : THRESHOLDS.LCP_DESKTOP;
  if (metrics.lcp > lcpThreshold) {
    violations.push(`LCP ${metrics.lcp}ms > ${lcpThreshold}ms (${result.device})`);
  }
  
  if (metrics.fid > THRESHOLDS.FID) {
    violations.push(`FID ${metrics.fid}ms > ${THRESHOLDS.FID}ms`);
  }
  
  if (metrics.cls > THRESHOLDS.CLS) {
    violations.push(`CLS ${metrics.cls} > ${THRESHOLDS.CLS}`);
  }
  
  if (metrics.totalJSSize > THRESHOLDS.TOTAL_JS_SIZE) {
    violations.push(`Total JS size ${metrics.totalJSSize} > ${THRESHOLDS.TOTAL_JS_SIZE}`);
  }

  return {
    url: result.url,
    device: result.device,
    timestamp: result.timestamp,
    passed: violations.length === 0,
    metrics,
    violations,
    rawLHR: lhr, // 保留原始数据以备详细分析
  };
}

/**
 * 格式化时间（毫秒）
 */
function formatTime(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 打印分析报告
 */
function printAnalysisReport(analyses) {
  console.log('\n📊 Lighthouse Performance Report');
  console.log('==================================\n');

  let allPassed = true;
  const summaryByUrl = {};

  for (const analysis of analyses) {
    const { url, device, passed, metrics, violations } = analysis;
    
    if (!summaryByUrl[url]) {
      summaryByUrl[url] = {};
    }
    summaryByUrl[url][device] = analysis;

    if (!passed) {
      allPassed = false;
    }

    // 打印单个结果
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${url} (${device})`);
    
    if (metrics.performanceScore !== undefined) {
      console.log(`  Performance Score: ${metrics.performanceScore}/100`);
      console.log(`  LCP: ${formatTime(metrics.lcp)}`);
      console.log(`  FID: ${formatTime(metrics.fid)}`);
      console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
      console.log(`  FCP: ${formatTime(metrics.fcp)}`);
      console.log(`  TTFB: ${formatTime(metrics.ttfb)}`);
      
      if (metrics.totalJSSize > 0) {
        console.log(`  Total JS: ${formatSize(metrics.totalJSSize)}`);
      }
    }

    if (violations.length > 0) {
      console.log('  Violations:');
      violations.forEach(violation => {
        console.log(`    • ${violation}`);
      });
    }
    
    console.log('');
  }

  // 总结
  console.log(`📈 Summary: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  
  if (!allPassed) {
    console.log('\n💡 Performance Optimization Suggestions:');
    console.log('  • Optimize images and enable next-gen formats');
    console.log('  • Reduce JavaScript bundle size');
    console.log('  • Enable compression (gzip/brotli)');
    console.log('  • Implement proper caching strategies');
    console.log('  • Consider code splitting and lazy loading');
    console.log('  • Optimize font loading strategy');
  }

  return allPassed;
}

/**
 * 保存报告文件
 */
function saveReports(analyses) {
  // 确保报告目录存在
  if (!fs.existsSync(CONFIG.REPORTS_DIR)) {
    fs.mkdirSync(CONFIG.REPORTS_DIR, { recursive: true });
  }

  // 保存详细报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const detailFile = path.join(CONFIG.REPORTS_DIR, `lighthouse-${timestamp}.json`);
  
  fs.writeFileSync(detailFile, JSON.stringify(analyses, null, 2));
  console.log(`📄 Detailed report saved: ${detailFile}`);

  // 保存摘要
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: analyses.length,
    passedTests: analyses.filter(a => a.passed).length,
    failedTests: analyses.filter(a => a.passed === false).length,
    thresholds: CONFIG.THRESHOLDS,
    results: analyses.map(a => ({
      url: a.url,
      device: a.device,
      passed: a.passed,
      performanceScore: a.metrics.performanceScore,
      lcp: a.metrics.lcp,
      violations: a.violations,
    })),
  };

  fs.writeFileSync(CONFIG.SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(`📄 Summary saved: ${CONFIG.SUMMARY_FILE}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Starting Lighthouse CI Tests...\n');

  // 检查是否有测试服务器运行
  console.log('⚠️  Make sure your test server is running on http://localhost:3000');
  console.log('   Run: npm run dev or npm run start\n');

  let chrome;
  
  try {
    // 启动 Chrome
    chrome = await launchChrome();
    console.log(`🌐 Chrome launched on port ${chrome.port}\n`);

    // 运行所有测试
    const results = [];
    
    for (const url of CONFIG.URLS) {
      for (const device of CONFIG.DEVICES) {
        const result = await runLighthouse(url, device, chrome);
        results.push(result);
        
        // 短暂延迟避免资源竞争
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 分析结果
    console.log('\n🔬 Analyzing results...\n');
    const analyses = results.map(analyzeLighthouseResult);

    // 打印报告
    const allPassed = printAnalysisReport(analyses);

    // 保存报告
    saveReports(analyses);

    // CI 模式处理
    if (process.env.CI && !allPassed) {
      console.log('\n🚨 CI Mode: Performance tests failed, exiting with code 1');
      process.exit(1);
    }

    console.log('\n🎉 Lighthouse CI completed successfully!');

  } catch (error) {
    console.error('❌ Lighthouse CI failed:', error);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
      console.log('🔚 Chrome instance closed');
    }
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runLighthouse,
  analyzeLighthouseResult,
  CONFIG,
};
