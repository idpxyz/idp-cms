import React from "react";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import NewsContent from "./NewsContent";
import { tagService } from "@/lib/api";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";

// 获取频道列表
async function getChannels() {
  try {
    // 使用统一的端点管理器构建URL
    const channelsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels'),
      { site: getMainSite().hostname }
    );

    // 使用统一的fetch配置
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 15000,
      next: { revalidate: 600 }, // 缓存10分钟
    });

    const response = await fetch(channelsUrl, fetchConfig);

    if (response.ok) {
      const data = await response.json();
      console.log('Successfully fetched channels from backend:', data.channels?.length || 0);
      
      // 确保推荐频道在最前面，并将数字ID转换为字符串slug以保持一致性
      const channels = data.channels || [];
      const recommendChannel = { id: "recommend", name: "推荐", slug: "recommend", order: -1 };
      const otherChannels = channels
        .filter((ch: any) => ch.slug !== "recommend")
        .map((ch: any) => ({
          ...ch,
          id: ch.slug // 使用slug作为ID，保持与前端期望的字符串ID一致
        }));
      
      return [recommendChannel, ...otherChannels];
    } else {
      if (response.status === 429) {
        console.log('Backend API rate limited, using fallback channels');
      } else {
        console.warn('Failed to fetch channels from backend, status:', response.status);
      }
    }
  } catch (error) {
    console.error('Error fetching channels from backend:', error);
  }

  // API调用失败时只返回推荐频道，避免硬编码数据库频道
  console.log('API failed, returning minimal fallback with recommend channel only');
  return [
    { id: "recommend", name: "推荐", slug: "recommend", order: -1 },
  ];
}

export default async function PortalPage({ searchParams }: { searchParams?: Promise<{ channel?: string; tags?: string }> }) {
  // 频道数据现在通过 Context 提供，但我们仍需要为 NewsContent 获取一份
  const channels = await getChannels();
  const sp = searchParams ? await searchParams : undefined;
  const urlChannel = sp?.channel;
  const tags = sp?.tags;
  const initialChannelId = (urlChannel && (channels.find((c:any) => c.slug === urlChannel)?.id || urlChannel)) || channels[0]?.id || "";
  // 拉取标签列表（用于筛选 chips）
  const tagsList = await tagService.list(30);

  // 已选择标签
  const selectedTags = (tags || '').split(',').filter(Boolean);

  // 构建带标签与频道的链接
  const buildTagHref = (tagSlug: string) => {
    const set = new Set(selectedTags);
    if (set.has(tagSlug)) set.delete(tagSlug); else set.add(tagSlug);
    const nextTags = Array.from(set).join(',');
    const qs = new URLSearchParams();
    if (urlChannel) qs.set('channel', urlChannel);
    if (nextTags) qs.set('tags', nextTags);
    qs.set('page', '1');
    return `/portal${qs.toString() ? `?${qs.toString()}` : ''}`;
  };

  return (
    <div className="min-h-screen">
      {/* 频道导航栏现在在 Layout 中 */}
      <PageContainer padding="md">
        {/* 标签筛选（全站） */}
        {tagsList && tagsList.length > 0 && (
          <Section space="sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">标签筛选</h2>
              <div className="flex flex-wrap gap-2">
                {tagsList.map((tag:any) => {
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
        <Section space="md">
          {/* 主要新闻内容区域 - 全宽度 */}
          <NewsContent
            channels={channels}
            initialChannelId={initialChannelId}
            // 当存在标签筛选时，NewsContent 将使用文章列表API按频道+标签回退
            // 而不是个性化/推荐策略
            tags={tags}
          />
        </Section>
      </PageContainer>
    </div>
  );
}
