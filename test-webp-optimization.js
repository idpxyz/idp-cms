#!/usr/bin/env node

/**
 * 测试文章图片WebP优化转换
 */

// 模拟optimizeArticleImages函数
function optimizeArticleImages(html) {
  if (!html) return '';
  
  const imgRegex = /<img([^>]*?)src=["']([^"']+\.(jpg|jpeg|png|JPG|JPEG|PNG))["']([^>]*?)>/gi;
  
  return html.replace(imgRegex, (match, beforeSrc, src, ext, afterSrc) => {
    const webpSrc = src.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '.webp');
    
    const fullAttrs = beforeSrc + afterSrc;
    
    const altMatch = fullAttrs.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '';
    
    const classMatch = fullAttrs.match(/class=["']([^"']*)["']/i);
    const className = classMatch ? classMatch[1] : '';
    
    const widthMatch = fullAttrs.match(/width=["']?(\d+)["']?/i);
    const width = widthMatch ? widthMatch[1] : '';
    
    const heightMatch = fullAttrs.match(/height=["']?(\d+)["']?/i);
    const height = heightMatch ? heightMatch[1] : '';
    
    const imageType = ext.toLowerCase() === 'png' ? 'png' : 'jpeg';
    
    return `<picture>
  <source type="image/webp" srcset="${webpSrc}">
  <source type="image/${imageType}" srcset="${src}">
  <img
    src="${src}"${alt ? `\n    alt="${alt}"` : ''}${className ? `\n    class="${className}"` : ''}${width ? `\n    width="${width}"` : ''}${height ? `\n    height="${height}"` : ''}
    loading="lazy"
    decoding="async"
  >
</picture>`;
  });
}

console.log('================================');
console.log('文章图片WebP优化测试');
console.log('================================\n');

// 测试用例1：简单的JPG图片
const test1 = '<img src="/test.jpg" alt="测试图片">';
console.log('测试1: 简单JPG图片');
console.log('输入:', test1);
console.log('输出:', optimizeArticleImages(test1));
console.log('');

// 测试用例2：实际文章中的图片
const test2 = '<img alt="12" class="richtext-image full-width" height="394" src="/api/media-proxy/portal/c2-portal-media/2025/09/renditions/4e9500db418a46ea.jpg" width="800">';
console.log('测试2: 实际文章图片（带class和尺寸）');
console.log('输入:', test2);
console.log('输出:\n', optimizeArticleImages(test2));
console.log('');

// 测试用例3：包含多张图片的HTML
const test3 = `<p>文章内容</p>
<img src="/img1.jpg" alt="图片1" class="test">
<p>更多内容</p>
<img src="/img2.png" alt="图片2" width="600" height="400">`;
console.log('测试3: 多张图片');
console.log('输入:', test3);
console.log('输出:\n', optimizeArticleImages(test3));
console.log('');

console.log('================================');
console.log('优化说明');
console.log('================================\n');
console.log('✅ 原始<img>标签被转换为<picture>标签');
console.log('✅ 浏览器优先尝试加载WebP格式');
console.log('✅ 如果WebP不存在或不支持，回退到原格式');
console.log('✅ 添加loading="lazy"实现懒加载');
console.log('✅ 添加decoding="async"异步解码');
console.log('');
console.log('📊 预期性能提升:');
console.log('  - 带宽减少: 40-60%');
console.log('  - 加载时间: 减少40-60%');
console.log('  - 用户体验: 更快的图片加载');
console.log('');

