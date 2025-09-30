import { endpoints } from '@/lib/config/endpoints';
import { retryService } from './RetryService';
import { TagsListResponse, TagDetailResponse, TagItem } from './taxonomy-types';

export class TagService {
  private static instance: TagService;
  static getInstance(): TagService {
    if (!TagService.instance) TagService.instance = new TagService();
    return TagService.instance;
  }

  async list(limit: number = 50): Promise<TagItem[]> {
    const url = endpoints.buildUrl(endpoints.getCmsEndpoint('/api/tags/'), { limit });
    const res = await retryService.executeWithRetry(() => fetch(url, endpoints.createFetchConfig()));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: TagsListResponse = await res.json();
    return data.results || [];
  }

  async detail(slug: string, size: number = 10): Promise<TagDetailResponse> {
    const url = endpoints.buildUrl(endpoints.getCmsEndpoint(`/api/tags/detail/${encodeURIComponent(slug)}/`), { size });
    const res = await retryService.executeWithRetry(() => fetch(url, endpoints.createFetchConfig()));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

export const tagService = TagService.getInstance();


