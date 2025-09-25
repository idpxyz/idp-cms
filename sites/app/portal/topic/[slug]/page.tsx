import React from "react";

async function fetchTopic(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/topics/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function TopicPage({ params }: { params: { slug: string } }) {
  const data = await fetchTopic(params.slug);
  const topic = data?.title ? data : null;
  const items = data?.articles || data?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{topic?.title || "话题"}</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">暂无相关报道</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it: any, idx: number) => (
            <li key={`topic-article-${it.id || idx}`} className="">
              <a
                href={it.slug ? `/portal/article/${it.slug}` : (it.id ? `/portal/article/${it.id}` : (it.url || "/portal"))}
                className="text-base text-gray-800 hover:text-red-500 transition-colors"
              >
                {it.title}
              </a>
              <div className="text-xs text-gray-400">{it.publish_at?.slice(0,19).replace('T',' ')}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
