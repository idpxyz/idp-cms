import React from "react";
import { categoryService, articleService, tagService } from "@/lib/api";
import { getMainSite } from "@/lib/config/sites";
import NewsContent from "../../components/NewsContent";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import { notFound } from 'next/navigation';

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string; size?: string; tags?: string }>;
}

// 获取分类信息
async function getCategory(slug: string) {
  try {
    console.log(`Fetching category: ${slug}`);
    const category = await categoryService.getCategoryDetail(slug);
    return category;
  } catch (error) {
    console.error(`Failed to fetch category ${slug}:`, error);
    return null;
  }
}

// 获取分类文章
async function getCategoryArticles(slug: string, page: number = 1, size: number = 20, tags?: string) {
  try {
    console.log(`Fetching articles for category: ${slug}, page: ${page}`);
    const response = await articleService.getArticlesByCategory(slug, {
      site: getMainSite().hostname,
      include: 'categories,topics',
      page,
      size,
      ...(tags ? { tags } : {}),
    });
    return response;
  } catch (error) {
    console.error(`Failed to fetch articles for category ${slug}:`, error);
    return { items: [], pagination: { page: 1, size: 20, total: 0, has_next: false, has_prev: false }, meta: { site: '', site_id: 0 } };
  }
}

// 获取频道列表（复用Portal页面的逻辑）
async function getChannels() {
  try {
    const channels = await categoryService.getCategories();
    const channelData = channels.map(cat => ({
      id: cat.slug,
      name: cat.name,
      slug: cat.slug,
      order: cat.order || 0
    }));
    
    // 只返回真实的数据库频道
    return channelData;
  } catch (error) {
    console.error('Error fetching channels:', error);
    // 返回空数组，避免显示虚拟频道
    return [];
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  // 等待参数解析
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  
  const page = parseInt(sp?.page || '1');
  const size = parseInt(sp?.size || '20');
  const tags = sp?.tags;

  // 并行获取分类信息、文章和频道数据
  const [category, articlesResponse, channels, tagsList] = await Promise.all([
    getCategory(slug),
    getCategoryArticles(slug, page, size, tags),
    getChannels(),
    tagService.list(30)
  ]);

  // 如果分类不存在，显示404
  if (!category) {
    notFound();
  }

  // 准备传递给NewsContent的数据
  const categoryArticles = articlesResponse.items.map(article => ({
    id: article.id.toString(),
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt || '',
    content: article.content || '',
    image_url: article.cover?.url || undefined,
    cover: article.cover,
    channel: article.channel || { id: slug, name: category.name, slug: slug },
    region: article.region ? { slug: article.region, name: article.region } : { slug: '', name: '' },
    publish_at: article.publish_at || '',
    updated_at: article.updated_at || '',
    is_featured: article.is_featured || false,
    source: article.source || category.name,
    author: article.author || '',
    tags: article.tags || [],
    weight: article.weight || 0,
    has_video: false,
    language: 'zh-CN',
    categories: article.categories,
    category_names: article.category_names,
    topic: article.topic,
    topic_slug: article.topic_slug,
    topic_title: article.topic_title,
  }));

  // 构建面包屑导航
  const breadcrumb = [
    { name: '首页', href: '/portal' },
    ...category.breadcrumb.map(item => ({
      name: item.name,
      href: `/portal/category/${item.slug}`
    }))
  ];

  // 解析已选择的标签
  const selectedTags = (tags || '').split(',').filter(Boolean);

  // 构建带标签参数的链接（切换选择状态）
  const buildTagHref = (tagSlug: string) => {
    const set = new Set(selectedTags);
    if (set.has(tagSlug)) set.delete(tagSlug); else set.add(tagSlug);
    const nextTags = Array.from(set).join(',');
    const qs = new URLSearchParams();
    if (nextTags) qs.set('tags', nextTags);
    // 切换标签时回到第一页
    qs.set('page', '1');
    return `/portal/category/${slug}${qs.toString() ? `?${qs.toString()}` : ''}`;
  };

  return (
    <div className="min-h-screen">
      <PageContainer padding="md">
        {/* 面包屑导航 */}
        <Section space="sm">
          <nav className="flex items-center space-x-2 news-meta mb-4">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span>/</span>}
                {index === breadcrumb.length - 1 ? (
                  <span className="text-gray-900 news-meta font-medium">{item.name}</span>
                ) : (
                  <a href={item.href} className="hover:text-gray-700">
                    {item.name}
                  </a>
                )}
              </React.Fragment>
            ))}
          </nav>
        </Section>

        {/* 分类标题和描述 */}
        <Section space="md">
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-lg text-gray-600 mb-4">
                    {category.description}
                  </p>
                )}
                
                {/* 分类统计信息 */}
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span>共 {articlesResponse.pagination.total} 篇文章</span>
                  {category.children_count > 0 && (
                    <span>{category.children_count} 个子分类</span>
                  )}
                  {category.channel_names && category.channel_names.length > 0 && (
                    <span>
                      相关频道: {category.channel_names.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 子分类导航 */}
        {category.children && category.children.length > 0 && (
          <Section space="sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">子分类</h2>
              <div className="flex flex-wrap gap-2">
                {category.children.map(child => (
                  <a
                    key={child.id}
                    href={`/portal/category/${child.slug}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    {child.name}
                    <span className="ml-1 text-xs text-blue-600">
                      ({child.articles_count})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* 标签筛选 */}
        {tagsList && tagsList.length > 0 && (
          <Section space="sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">标签筛选</h2>
              <div className="flex flex-wrap gap-2">
                {tagsList.map(tag => {
                  const active = selectedTags.includes(tag.slug);
                  return (
                    <a
                      key={tag.slug}
                      href={buildTagHref(tag.slug)}
                      className={
                        `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ` +
                        (active
                          ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200')
                      }
                      title={tag.name}
                    >
                      {tag.name}
                      {typeof tag.articles_count === 'number' && (
                        <span className="ml-1 text-xs opacity-70">({tag.articles_count})</span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* 文章内容区域 */}
        <Section space="md">
          <NewsContent
            channels={channels}
            initialChannelId={slug}
            // 传递预获取的文章数据
            initialArticles={categoryArticles}
            // 标记这是分类页面
            categoryMode={true}
            categorySlug={slug}
            categoryName={category.name}
            // 传递分页信息
            pagination={articlesResponse.pagination}
          />
        </Section>

        {/* 最近文章（如果有） */}
        {category.recent_articles && category.recent_articles.length > 0 && (
          <Section space="md">
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">最近文章</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.recent_articles.map(article => (
                  <a
                    key={article.id}
                    href={`/portal/article/${article.slug}`}
                    className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="text-sm text-gray-500">
                      {new Date(article.publish_date).toLocaleDateString('zh-CN')}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </Section>
        )}
      </PageContainer>
    </div>
  );
}

// 生成静态参数（可选，用于静态生成）
export async function generateStaticParams() {
  try {
    const categories = await categoryService.getCategories();
    return categories.slice(0, 10).map(category => ({ // 限制数量避免构建时间过长
      slug: category.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for categories:', error);
    return [];
  }
}

// 元数据生成
export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  
  try {
    const category = await categoryService.getCategoryDetail(slug);
    
    if (!category) {
      return {
        title: '分类未找到',
        description: '请求的分类不存在'
      };
    }

    return {
      title: `${category.name} - ${getMainSite().name}`,
      description: category.description || `浏览 ${category.name} 分类下的所有文章`,
      keywords: [category.name, ...category.channel_names || []].join(', '),
      openGraph: {
        title: category.name,
        description: category.description || `浏览 ${category.name} 分类下的所有文章`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: '分类加载失败',
      description: '无法加载分类信息'
    };
  }
}
