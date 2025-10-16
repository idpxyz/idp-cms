import Link from "next/link";

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

async function getTopTags() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/tags/top`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { tags: [] };
    return res.json();
  } catch {
    return { tags: [] };
  }
}

export default async function TagsIndexPage() {
  const data = await getTopTags();
  const tags = Array.isArray(data?.tags) ? data.tags : [] as Array<{ name: string; slug: string; count?: number }>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 className="text-xl font-bold mb-4">热门标签</h1>
      {tags.length === 0 ? (
        <p className="text-gray-500 text-sm">暂无标签</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t: { name: string; slug: string; count?: number }) => (
            <Link
              key={t.slug || t.name}
              href={`/portal/tags/${encodeURIComponent(t.slug || t.name)}`}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              #{t.name}{typeof t.count === "number" ? ` (${t.count})` : ""}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


