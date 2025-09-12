import { NextRequest } from "next/server";
import { articleService } from "@/lib/api/ArticleService";
import { success, ErrorResponses, handleError } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return ErrorResponses.badRequest("文章slug不能为空");
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const requestedSite = searchParams.get('site') || undefined;
    const includeDrafts = searchParams.get('include_drafts') === 'true';

    // 使用统一ArticleService查找文章
    const result = await articleService.findBySlug(slug, {
      site: requestedSite,
      include_drafts: includeDrafts,
      include_content: true,
      cache_ttl: 600, // 10分钟缓存
    });

    if (!result.article) {
      return ErrorResponses.articleNotFound(slug);
    }

    return success(
      result.article,
      "获取文章详情成功",
      {
        meta: {
          cache_status: result.source === 'cache' ? 'hit' : 'miss',
          execution_time_ms: result.execution_time_ms,
        },
        debug: {
          source: result.source,
          fallback_used: result.fallback_used,
          execution_time_ms: result.execution_time_ms,
        },
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return handleError(error, 'article lookup');
  }
}
