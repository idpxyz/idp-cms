/**
 * 智能占位图片工具
 * 当文章没有真实图片时，提供高质量的占位图片
 */

// 新闻类别对应的图片主题
const NEWS_CATEGORY_THEMES = {
  // 政治新闻
  politics: ['government', 'parliament', 'voting', 'politics', 'cityscape'],
  政治: ['government', 'parliament', 'voting', 'politics', 'cityscape'],
  
  // 经济财经
  finance: ['business', 'finance', 'economy', 'stock-market', 'money'],
  经济: ['business', 'finance', 'economy', 'stock-market', 'money'],
  economy: ['business', 'finance', 'economy', 'stock-market', 'money'],
  
  // 科技
  tech: ['technology', 'computer', 'innovation', 'digital', 'ai'],
  科技: ['technology', 'computer', 'innovation', 'digital', 'ai'],
  technology: ['technology', 'computer', 'innovation', 'digital', 'ai'],
  
  // 文化
  culture: ['culture', 'art', 'museum', 'heritage', 'traditional'],
  文化: ['culture', 'art', 'museum', 'heritage', 'traditional'],
  
  // 体育
  sports: ['sports', 'football', 'basketball', 'olympics', 'stadium'],
  体育: ['sports', 'football', 'basketball', 'olympics', 'stadium'],
  
  // 健康医疗
  health: ['health', 'medical', 'hospital', 'medicine', 'healthcare'],
  医疗: ['health', 'medical', 'hospital', 'medicine', 'healthcare'],
  健康: ['health', 'medical', 'hospital', 'medicine', 'healthcare'],
  
  // 教育
  education: ['education', 'school', 'university', 'learning', 'books'],
  教育: ['education', 'school', 'university', 'learning', 'books'],
  
  // 环境
  environment: ['nature', 'environment', 'green', 'sustainability', 'landscape'],
  环境: ['nature', 'environment', 'green', 'sustainability', 'landscape'],
  
  // 国际新闻
  international: ['world', 'global', 'international', 'flags', 'earth'],
  国际: ['world', 'global', 'international', 'flags', 'earth'],
  
  // 社会
  society: ['people', 'community', 'social', 'city', 'crowd'],
  社会: ['people', 'community', 'social', 'city', 'crowd'],
  
  // 军事
  military: ['military', 'defense', 'security', 'army', 'navy'],
  军事: ['military', 'defense', 'security', 'army', 'navy'],
  
  // 旅游
  travel: ['travel', 'tourism', 'vacation', 'destination', 'adventure'],
  旅游: ['travel', 'tourism', 'vacation', 'destination', 'adventure'],
  
  // 默认新闻
  default: ['news', 'newspaper', 'media', 'journalism', 'press']
};

// 高质量图片源配置
const IMAGE_SOURCES = {
  // Unsplash - 高质量免费图片
  unsplash: {
    baseUrl: 'https://images.unsplash.com',
    features: ['featured', 'random'],
    collections: {
      news: '1463919', // 新闻摄影集合
      business: '1162961', // 商业集合
      technology: '162326', // 科技集合
      nature: '190727', // 自然集合
      people: '139386', // 人物集合
      architecture: '186849' // 建筑集合
    }
  },
  
  // Picsum - 稳定的占位图服务  
  picsum: {
    baseUrl: 'https://picsum.photos',
    grayscale: true, // 支持灰度
    blur: true       // 支持模糊
  },
  
  // Lorem Picsum - 备用方案
  loremPicsum: {
    baseUrl: 'https://loremflickr.com',
    cache: 'all'     // 缓存控制
  }
};

/**
 * 根据文章内容生成智能占位图片URL
 */
export function generateSmartPlaceholderImage(
  article: {
    title?: string;
    channel?: { name?: string; slug?: string };
    tags?: string[];
    id?: string | number;
  },
  options: {
    width?: number;
    height?: number;
    quality?: number;
    preferredSource?: 'local' | 'svg' | 'unsplash' | 'picsum' | 'loremPicsum';
    fallbackToSvg?: boolean;
  } = {}
): string {
  const {
    width = 800,
    height = 450,
    quality = 80,
    preferredSource = 'local',  // 默认使用本地 SVG 图片
    fallbackToSvg = true
  } = options;

  // 分析文章内容确定主题
  const theme = determineImageTheme(article);
  const seed = generateSeed(article);

  try {
    switch (preferredSource) {
      case 'local':
        // 使用本地存储的默认封面图片
        return getLocalDefaultCover(theme);
      
      case 'svg':
        return generateSvgPlaceholder(width, height, theme);
      
      case 'unsplash':
        // 暂时禁用 Unsplash，使用稳定的 Picsum 替代
        return generatePicsumUrl(width, height, seed);
      
      case 'picsum':
        return generatePicsumUrl(width, height, seed);
      
      case 'loremPicsum':
        return generateLoremPicsumUrl(theme, width, height, seed);
      
      default:
        return getLocalDefaultCover(theme);  // 默认使用本地图片
    }
  } catch (error) {
    console.warn('生成占位图片失败，使用备用方案:', error);
    
    if (fallbackToSvg) {
      return generateSvgPlaceholder(width, height, theme);
    }
    
    return getLocalDefaultCover(theme);
  }
}

/**
 * 获取本地默认封面图片
 */
function getLocalDefaultCover(theme: string): string {
  // 主题到分类的映射
  const themeToCategory: { [key: string]: string } = {
    'government': 'politics',
    'parliament': 'politics',
    'voting': 'politics',
    'politics': 'politics',
    'cityscape': 'default',
    
    'business': 'economy',
    'finance': 'economy',
    'economy': 'economy',
    'stock-market': 'economy',
    'money': 'economy',
    
    'technology': 'tech',
    'computer': 'tech',
    'innovation': 'tech',
    'digital': 'tech',
    'ai': 'tech',
    
    'culture': 'culture',
    'art': 'culture',
    'museum': 'culture',
    'heritage': 'culture',
    'traditional': 'culture',
    
    'sports': 'sports',
    'football': 'sports',
    'basketball': 'sports',
    'olympics': 'sports',
    'stadium': 'sports',
    
    'health': 'health',
    'medical': 'health',
    'hospital': 'health',
    'medicine': 'health',
    'healthcare': 'health',
    
    'education': 'education',
    'school': 'education',
    'university': 'education',
    'learning': 'education',
    'books': 'education',
    
    'nature': 'environment',
    'environment': 'environment',
    'green': 'environment',
    'sustainability': 'environment',
    'landscape': 'environment',
    
    'world': 'international',
    'global': 'international',
    'international': 'international',
    'flags': 'international',
    'earth': 'international',
    
    'people': 'society',
    'community': 'society',
    'social': 'society',
    'city': 'society',
    'crowd': 'society',
    
    'military': 'military',
    'defense': 'military',
    'security': 'military',
    'army': 'military',
    'navy': 'military',
    
    'travel': 'travel',
    'tourism': 'travel',
    'vacation': 'travel',
    'destination': 'travel',
    'adventure': 'travel',
    
    'news': 'default',
    'newspaper': 'default',
    'media': 'default',
    'journalism': 'default',
    'press': 'default'
  };
  
  // 获取对应的分类，如果找不到则使用默认
  const category = themeToCategory[theme.toLowerCase()] || 'default';
  
  // 返回本地 SVG 图片的路径
  return `/images/default-covers/${category}.svg`;
}

/**
 * 分析文章确定图片主题
 */
function determineImageTheme(article: {
  title?: string;
  channel?: { name?: string; slug?: string };
  tags?: string[];
}): string {
  // 1. 优先根据频道分类
  if (article.channel) {
    const channelName = article.channel.name?.toLowerCase() || article.channel.slug?.toLowerCase() || '';
    
    for (const [category, themes] of Object.entries(NEWS_CATEGORY_THEMES)) {
      if (channelName.includes(category.toLowerCase())) {
        return themes[Math.floor(Math.random() * themes.length)];
      }
    }
  }
  
  // 2. 根据标题关键词判断
  if (article.title) {
    const title = article.title.toLowerCase();
    
    for (const [category, themes] of Object.entries(NEWS_CATEGORY_THEMES)) {
      if (title.includes(category)) {
        return themes[Math.floor(Math.random() * themes.length)];
      }
    }
    
    // 检查标题中的关键词
    const keywords = {
      '科技|技术|AI|人工智能|数字|创新': 'technology',
      '经济|金融|财政|股市|投资|贸易': 'business',
      '政治|政府|政策|选举|国家|党': 'politics',
      '文化|艺术|传统|历史|文物': 'culture',
      '体育|运动|比赛|奥运|世界杯': 'sports',
      '健康|医疗|医院|病毒|疫苗': 'health',
      '教育|学校|大学|学习|考试': 'education',
      '环境|生态|绿色|污染|气候': 'nature',
      '军事|国防|安全|军队|武器': 'military',
      '旅游|旅行|景点|假期|酒店': 'travel'
    };
    
    for (const [pattern, theme] of Object.entries(keywords)) {
      if (new RegExp(pattern).test(title)) {
        const themes = NEWS_CATEGORY_THEMES[theme as keyof typeof NEWS_CATEGORY_THEMES] || NEWS_CATEGORY_THEMES.default;
        return themes[Math.floor(Math.random() * themes.length)];
      }
    }
  }
  
  // 3. 根据标签判断
  if (article.tags && article.tags.length > 0) {
    const tagText = article.tags.join(' ').toLowerCase();
    
    for (const [category, themes] of Object.entries(NEWS_CATEGORY_THEMES)) {
      if (tagText.includes(category.toLowerCase())) {
        return themes[Math.floor(Math.random() * themes.length)];
      }
    }
  }
  
  // 4. 默认新闻主题
  const defaultThemes = NEWS_CATEGORY_THEMES.default;
  return defaultThemes[Math.floor(Math.random() * defaultThemes.length)];
}

/**
 * 生成稳定的种子值（确保同一文章每次获得相同图片）
 */
function generateSeed(article: { id?: string | number; title?: string }): string {
  const id = article.id?.toString() || '';
  const title = article.title || '';
  
  // 简单哈希函数生成一致性种子
  let hash = 0;
  const input = id + title;
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString();
}

/**
 * 生成Unsplash图片URL
 */
function generateUnsplashUrl(
  theme: string, 
  width: number, 
  height: number, 
  quality: number, 
  seed: string
): string {
  const collections = Object.values(IMAGE_SOURCES.unsplash.collections).join(',');
  
  // 构建Unsplash URL
  const baseUrl = 'https://images.unsplash.com';
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: width.toString(),
    h: height.toString(),
    q: quality.toString(),
    ixlib: 'rb-4.0.3',
    ixid: `placeholder-${seed}`,
    // 使用主题作为搜索词
    ...(theme && { q: theme })
  });
  
  // 使用特定的Unsplash照片ID（根据主题和种子选择）
  const photoId = generateUnsplashPhotoId(theme, seed);
  
  return `${baseUrl}/photo-${photoId}?${params.toString()}`;
}

/**
 * 生成Picsum图片URL
 */
function generatePicsumUrl(width: number, height: number, seed: string): string {
  const id = parseInt(seed) % 1000 + 1; // 确保ID在1-1000范围内
  return `https://picsum.photos/${width}/${height}?random=${id}`;
}

/**
 * 生成LoremPicsum图片URL
 */
function generateLoremPicsumUrl(theme: string, width: number, height: number, seed: string): string {
  const id = parseInt(seed) % 100;
  return `https://loremflickr.com/${width}/${height}/${theme}?random=${id}`;
}

/**
 * 生成SVG占位图片
 */
function generateSvgPlaceholder(width: number, height: number, theme: string): string {
  const iconMap: { [key: string]: string } = {
    technology: '💻',
    business: '💼', 
    politics: '🏛️',
    culture: '🎨',
    sports: '⚽',
    health: '🏥',
    education: '📚',
    nature: '🌱',
    military: '🛡️',
    travel: '✈️',
    default: '📰'
  };
  
  const icon = iconMap[theme] || iconMap.default;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="48" fill="#9ca3af" text-anchor="middle" dy=".3em">
        ${icon}
      </text>
      <text x="50%" y="65%" font-family="Arial" font-size="14" fill="#6b7280" text-anchor="middle" dy=".3em">
        ${theme}
      </text>
    </svg>
  `.trim();
  
  // 使用URL编码而不是base64，避免中文字符编码问题
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 根据主题和种子生成Unsplash照片ID
 */
function generateUnsplashPhotoId(theme: string, seed: string): string {
  // 预定义的高质量照片ID列表（按主题分类）
  const photoIds: { [key: string]: string[] } = {
    technology: ['iar-afB0QQw', 'npxXWgQ33ZQ', 'jrh5lAq-mIs', 'ZVprbBmT8QA', 'fPkvU7RDmCo'],
    business: ['aJeH0KcFkuc', 'fiXLQXAhCfk', 'JrjhtBJ-pGU', 'Hcfwew744z4', 'JKUTrJ4vK00'],
    politics: ['GmYiKn7U3gE', 'TN8xRLKGs7s', 'fN603qcEA7g', 'QdOJo8m_Xj0', 'Jztmx9yqjBw'],
    culture: ['qgHGDbbSNm8', 'T9rKvI3N0NM', 'c77MZhzZQRo', 'ZKjEn-56-Pc', 'mXSm_N9j2F8'],
    sports: ['nqUHQkRJIDo', 'lGKtsV7aMG0', 'bnG4-dqRUzk', 'pjAH2-15P6o', 'rDEOVtE7vOs'],
    health: ['eHD8Y1Znfpk', 'SJvDxw0azqw', 'qe60ykJcMGg', 'ZTx7OpGONNY', 'L8tWZT4CcVQ'],
    education: ['VHjb5tazCZI', 'GRfYU3cF7qw', 'GQJ1TvYEhog', 'QQ9LainS6tI', 'bUrVNdwHBD8'],
    nature: ['WoBOzO-5Ub4', 'l0rkdJ8MXw4', 'UXKRYwNnbUU', 'YtgWA21K9QU', 'kLf3Fn9z4P4'],
    military: ['FVJCKhPNd2k', 'LNRyGwIJr5c', 'H_Z4Lx5gQek', 'JKNGPFn5-y4', 'ZmyCLElqoRc'],
    travel: ['iO7oxCsRSg0', 'YKW0JjP7weg', 'cHeRLN4mMD4', 'vgTtSCW-LRU', 'MEwBSz2t_Y4'],
    default: ['AbMukjwhN_c', 'NFvdKIhxYlU', 'lJsGJWaEtx8', 'YZf4n9W5Hg8', 'rYm-WGsKMBU']
  };
  
  const ids = photoIds[theme] || photoIds.default;
  const index = parseInt(seed) % ids.length;
  return ids[index];
}

/**
 * 便捷函数：为TopStoryItem生成占位图片
 */
export function getTopStoryPlaceholderImage(item: {
  id?: string | number;
  title?: string;
  channel?: { name?: string; slug?: string };
  tags?: string[];
}): string {
  return generateSmartPlaceholderImage(item, {
    width: 800,
    height: 450,
    quality: 85,
    preferredSource: 'local'  // 使用本地 SVG 默认封面
  });
}

/**
 * 便捷函数：为侧边新闻生成小尺寸占位图片
 */
export function getSideNewsPlaceholderImage(item: {
  id?: string | number;
  title?: string;
  channel?: { name?: string; slug?: string };
  tags?: string[];
}): string {
  return generateSmartPlaceholderImage(item, {
    width: 300,
    height: 200,
    quality: 80,
    preferredSource: 'local'  // 使用本地 SVG 默认封面
  });
}
