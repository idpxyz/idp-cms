import Link from "next/link";

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

async function getTagArticles(slug: string, page = 1, size = 20) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/tags/${encodeURIComponent(slug)}?page=${page}&size=${size}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { hits: [], total: 0, page, size };
    return res.json();
  } catch {
    return { hits: [], total: 0, page, size };
  }
}

export default async function TagDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ page?: string }>}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam || 1) || 1;
  const size = 20;
  const data = await getTagArticles(slug, page, size);
  const items = Array.isArray(data?.hits) ? data.hits : [] as Array<any>;
  const total = Number(data?.total || items.length);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">#{decodeURIComponent(slug)}</h1>
        <Link href="/portal/tags" className="text-sm text-gray-600 hover:text-red-600">返回标签</Link>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">暂无文章</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((a: any) => (
            <li key={a.id} className="py-3">
              <Link href={a.slug ? `/portal/article/${a.slug}` : `/portal`} className="text-gray-900 hover:text-red-600 font-medium">
                {a.title}
              </Link>
              <div className="text-xs text-gray-500 mt-1">
                <span>{a.channel || a.primary_channel_slug || ""}</span>
                {a.publish_at && <span className="ml-2">{new Date(a.publish_at).toLocaleString()}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > page * size && (
        <div className="mt-4 text-center">
          <Link href={`/portal/tags/${encodeURIComponent(slug)}?page=${page + 1}`} className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:border-red-300 hover:text-red-600">
            下一页
          </Link>
        </div>
      )}
    </div>
  );
}


