#!/usr/bin/env node

/**
 * HeroCarousel 功能测试脚本
 */

const http = require('http');

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TESTS = [
  {
    name: '门户首页',
    path: '/portal',
    expectedStatus: 200,
    checkContent: ['HeroCarousel', 'hero', 'carousel', '轮播']
  },
  {
    name: 'HeroCarousel 演示页面',
    path: '/portal/demo/hero-carousel',
    expectedStatus: 200,
    checkContent: ['Hero Carousel 演示', '完整功能演示', '响应式设计']
  }
];

// 发送 HTTP 请求
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// 运行测试
async function runTests() {
  console.log('🧪 开始测试 HeroCarousel 功能...\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    try {
      console.log(`📋 测试: ${test.name}`);
      console.log(`🔗 URL: ${BASE_URL}${test.path}`);
      
      const result = await makeRequest(BASE_URL + test.path);
      
      // 检查状态码
      if (result.status === test.expectedStatus) {
        console.log(`✅ 状态码: ${result.status} (正确)`);
      } else {
        console.log(`❌ 状态码: ${result.status} (期望: ${test.expectedStatus})`);
        failed++;
        continue;
      }
      
      // 检查内容
      let contentMatches = 0;
      for (const content of test.checkContent) {
        if (result.body.toLowerCase().includes(content.toLowerCase())) {
          contentMatches++;
          console.log(`✅ 内容检查: 找到 "${content}"`);
        } else {
          console.log(`⚠️  内容检查: 未找到 "${content}"`);
        }
      }
      
      if (contentMatches > 0) {
        console.log(`✅ 内容检查: ${contentMatches}/${test.checkContent.length} 项通过`);
        passed++;
      } else {
        console.log(`❌ 内容检查: 0/${test.checkContent.length} 项通过`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  // 输出测试结果
  console.log('📊 测试结果:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！HeroCarousel 功能正常工作。');
    process.exit(0);
  } else {
    console.log('\n⚠️  有测试失败，请检查上面的错误信息。');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行出错:', error.message);
  process.exit(1);
});
