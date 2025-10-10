/**
 * 文章页面加载骨架屏
 * 在文章数据加载时显示，提供即时反馈
 */
export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 面包屑骨架 */}
        <nav className="py-2">
          <div className="h-4 w-48 bg-gray-200 animate-pulse rounded"></div>
        </nav>

        <div className="py-2">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 主内容骨架 */}
            <div className="lg:col-span-2">
              <article className="bg-white rounded-lg shadow-sm overflow-hidden">
                <header className="px-6 md:px-12 pt-6 md:pt-8">
                  {/* 标题骨架 */}
                  <div className="space-y-3 mb-6">
                    <div className="h-8 bg-gray-200 animate-pulse rounded w-full"></div>
                    <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
                  </div>

                  {/* 元信息骨架 */}
                  <div className="flex gap-4 pb-3">
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-4 w-28 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                </header>

                {/* 封面图片骨架 */}
                <div className="relative w-full h-64 md:h-96 my-4 bg-gray-200 animate-pulse"></div>

                {/* 正文骨架 */}
                <div className="px-6 md:px-12 py-6 space-y-4">
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-4/5"></div>
                  <div className="h-6 bg-gray-100 animate-pulse rounded w-full my-6"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                </div>
              </article>
            </div>

            {/* 侧边栏骨架 */}
            <aside className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-40 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="h-5 bg-gray-200 animate-pulse rounded w-32 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6"></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="h-5 bg-gray-200 animate-pulse rounded w-32 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-4/5"></div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

