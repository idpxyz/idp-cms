/**
 * 优化文章图片 - 自动转换为WebP格式
 * 
 * 将HTML中的<img>标签转换为<picture>标签
 * 优先使用WebP，回退到原格式
 */

export function optimizeArticleImages(html: string): string {
  if (!html) return '';
  
  // 正则匹配所有img标签（包括URL中包含jpg/jpeg/png但后面可能有参数的）
  const imgRegex = /<img([^>]*?)src=["']([^"']+\.(jpg|jpeg|png|JPG|JPEG|PNG)[^"']*)["']([^>]*?)>/gi;
  
  return html.replace(imgRegex, (match, beforeSrc, src, ext, afterSrc) => {
    // 🚀 只对本站图片进行WebP转换，外部图床保持原样
    const isExternalImage = src.startsWith('http://') || src.startsWith('https://');
    if (isExternalImage && !src.includes(process.env.NEXT_PUBLIC_SITE_URL || '')) {
      // 外部图床：不转换格式，只添加懒加载
      // 移除afterSrc末尾的 / (自闭合标签)
      const cleanAfterSrc = afterSrc.replace(/\/\s*$/, '').trim();
      const cleanBeforeSrc = beforeSrc.trim();
      const attrs = [cleanBeforeSrc, cleanAfterSrc].filter(Boolean).join(' ');
      return `<img ${attrs} src="${src}" loading="lazy" decoding="async">`;
    }
    
    // 生成WebP版本的URL（直接替换扩展名，保持路径不变）
    const webpSrc = src.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '.webp');
    
    // 提取图片属性
    const fullAttrs = beforeSrc + afterSrc;
    
    // 提取alt属性
    const altMatch = fullAttrs.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '';
    
    // 提取class属性
    const classMatch = fullAttrs.match(/class=["']([^"']*)["']/i);
    const className = classMatch ? classMatch[1] : '';
    
    // 提取width属性
    const widthMatch = fullAttrs.match(/width=["']?(\d+)["']?/i);
    const width = widthMatch ? widthMatch[1] : '';
    
    // 提取height属性
    const heightMatch = fullAttrs.match(/height=["']?(\d+)["']?/i);
    const height = heightMatch ? heightMatch[1] : '';
    
    // 提取style属性
    const styleMatch = fullAttrs.match(/style=["']([^"']*)["']/i);
    const style = styleMatch ? styleMatch[1] : '';
    
    // 确定原图片的MIME类型
    const imageType = ext.toLowerCase() === 'png' ? 'png' : 'jpeg';
    
    // 构建picture标签（使用CSS类而不是内联style，避免hydration问题）
    return `<picture>
  <source type="image/webp" srcset="${webpSrc}">
  <source type="image/${imageType}" srcset="${src}">
  <img
    src="${src}"${alt ? `\n    alt="${alt}"` : ''}${className ? `\n    class="${className} lazy-image-placeholder"` : '\n    class="lazy-image-placeholder"'}${width ? `\n    width="${width}"` : ''}${height ? `\n    height="${height}"` : ''}${style ? `\n    style="${style}"` : ''}
    loading="lazy"
    decoding="async"
  >
</picture>`;
  });
}

/**
 * 为文章图片添加懒加载（如果还没有picture标签优化）
 */
export function addLazyLoading(html: string): string {
  if (!html) return '';
  
  // 只处理不在picture标签内的img
  const imgRegex = /<img(?![^>]*loading=)([^>]*)>/gi;
  
  return html.replace(imgRegex, (match, attrs) => {
    // 如果已经有loading属性，跳过
    if (/loading=/i.test(attrs)) {
      return match;
    }
    
    // 添加lazy loading和async decoding
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
}

/**
 * 组合优化：WebP + 懒加载
 */
export function optimizeArticleContent(html: string): string {
  // 先转换为WebP的picture标签
  let optimized = optimizeArticleImages(html);
  
  // 为其他可能的img标签添加懒加载
  optimized = addLazyLoading(optimized);
  
  return optimized;
}

