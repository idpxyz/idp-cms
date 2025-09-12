#!/usr/bin/env node

/**
 * 批量重构URL管理脚本
 * 自动化迁移所有API路由到统一的端点管理器
 */

const fs = require('fs');
const path = require('path');

// 需要重构的文件模式
const FILES_TO_REFACTOR = [
  'app/api/**/route.ts',
  'app/portal/**/page.tsx',
  'lib/services/**/*.ts',
];

// URL模式映射
const URL_PATTERNS = [
  {
    pattern: /process\.env\.CMS_ORIGIN \|\| ['"](http:\/\/[^'"]+)['"]/, 
    replacement: 'endpoints.getCmsEndpoint()',
    importNeeded: true
  },
  {
    pattern: /process\.env\.NEXT_PUBLIC_SITE_URL \|\| ['"](http:\/\/[^'"]+)['"]/, 
    replacement: 'endpoints.getFrontendEndpoint()',
    importNeeded: true
  },
  {
    pattern: /const cmsOrigin = [^;]+;/,
    replacement: '// URL managed by endpoints service',
    importNeeded: true
  },
  {
    pattern: /const CMS_ORIGIN = [^;]+;/,
    replacement: '// URL managed by endpoints service',
    importNeeded: true
  }
];

function findFilesRecursively(dir, pattern) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findFilesRecursively(fullPath, pattern));
    } else if (stat.isFile() && pattern.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function refactorFile(filePath) {
  console.log(`\n🔧 Refactoring: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let needsImport = false;
  
  // 应用每个URL模式替换
  for (const { pattern, replacement, importNeeded } of URL_PATTERNS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
      if (importNeeded) needsImport = true;
    }
  }
  
  // 添加import语句（如果需要且还没有）
  if (needsImport && !content.includes('from "@/lib/config/endpoints"')) {
    // 找到第一个import语句后添加
    const importRegex = /import[^;]+;/;
    const match = content.match(importRegex);
    if (match) {
      const insertPosition = content.indexOf(match[0]) + match[0].length;
      content = content.slice(0, insertPosition) + 
                '\nimport { endpoints } from "@/lib/config/endpoints";' +
                content.slice(insertPosition);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`   ✅ Modified`);
    return true;
  } else {
    console.log(`   ⏭️  No changes needed`);
    return false;
  }
}

function main() {
  console.log('🚀 Starting URL Management Refactoring\n');
  console.log('This script will:');
  console.log('1. Find all files with hardcoded URLs');
  console.log('2. Replace them with unified endpoint manager calls');
  console.log('3. Add necessary import statements\n');
  
  const sitesDir = path.resolve(__dirname, '..');
  
  // 查找所有需要重构的TypeScript文件
  const tsFiles = findFilesRecursively(sitesDir, /\.(ts|tsx)$/);
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  console.log(`Found ${tsFiles.length} TypeScript files to check...\n`);
  
  for (const file of tsFiles) {
    // 跳过一些不需要重构的文件
    if (file.includes('node_modules') || 
        file.includes('.next') ||
        file.includes('endpoints.ts') ||
        file.includes('refactor-urls.js')) {
      continue;
    }
    
    totalFiles++;
    if (refactorFile(file)) {
      modifiedFiles++;
    }
  }
  
  console.log(`\n📊 Refactoring Summary:`);
  console.log(`   Total files checked: ${totalFiles}`);
  console.log(`   Files modified: ${modifiedFiles}`);
  console.log(`   Files unchanged: ${totalFiles - modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log(`\n✨ Refactoring completed! Please review the changes and test the application.`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Run: npm run build`);
    console.log(`   2. Test all API endpoints`);
    console.log(`   3. Update environment variables if needed`);
  } else {
    console.log(`\n🎉 No files needed refactoring - your codebase is already clean!`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { refactorFile, URL_PATTERNS };
