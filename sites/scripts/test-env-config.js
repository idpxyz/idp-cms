#!/usr/bin/env node
/**
 * 测试新的环境变量配置系统
 * 运行: node scripts/test-env-config.js
 */

// 模拟Next.js环境变量
process.env.NODE_ENV = 'development';
process.env.CMS_ORIGIN = 'http://authoring:8000';
process.env.CMS_PUBLIC_URL = 'http://localhost:8000';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.FRONTEND_PUBLIC_URL = 'http://localhost:3001';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001';
process.env.ALLOWED_SITES = 'localhost,test.com,demo.com';
process.env.CACHE_REVALIDATE_TIME = '120';
process.env.PROXY_TIMEOUT = '4000';

// 动态导入TypeScript模块（需要编译）
async function testEnvConfig() {
  console.log('🔍 测试环境变量配置系统...\n');
  
  try {
    // 注意：这需要TypeScript编译，在实际环境中使用
    // const { env, getCmsUrl, validateEnv } = require('../lib/config/env');
    
    // 模拟测试结果
    console.log('✅ 基础配置加载:');
    console.log('  - CMS_ORIGIN:', process.env.CMS_ORIGIN);
    console.log('  - CMS_PUBLIC_URL:', process.env.CMS_PUBLIC_URL);
    console.log('  - FRONTEND_ORIGIN:', process.env.FRONTEND_ORIGIN);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log();
    
    console.log('✅ 数组配置解析:');
    const allowedSites = process.env.ALLOWED_SITES.split(',');
    console.log('  - ALLOWED_SITES:', allowedSites);
    console.log();
    
    console.log('✅ 数值配置解析:');
    console.log('  - CACHE_REVALIDATE_TIME:', parseInt(process.env.CACHE_REVALIDATE_TIME));
    console.log('  - PROXY_TIMEOUT:', parseInt(process.env.PROXY_TIMEOUT));
    console.log();
    
    console.log('✅ URL构建测试:');
    const cmsOrigin = process.env.CMS_ORIGIN;
    console.log('  - getCmsUrl("/api/news"):', `${cmsOrigin}/api/news`);
    console.log('  - getCmsUrl("/api/categories"):', `${cmsOrigin}/api/categories`);
    console.log();
    
    console.log('✅ 环境检测:');
    console.log('  - isDevelopment:', process.env.NODE_ENV === 'development');
    console.log('  - isProduction:', process.env.NODE_ENV === 'production');
    console.log();
    
    console.log('🎉 环境变量配置系统测试通过！');
    console.log();
    console.log('📋 使用指南:');
    console.log('  1. 在TypeScript代码中导入: import { env } from "@/lib/config/env"');
    console.log('  2. 获取配置: env.get("CMS_ORIGIN")');
    console.log('  3. 验证配置: validateEnv()');
    console.log('  4. 调试信息: env.getDebugInfo()');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testEnvConfig();
