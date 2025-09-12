import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">文章未找到</h1>
        <p className="text-gray-600 mb-8">
          抱歉，您要查找的文章不存在或已被删除。
        </p>
        <div className="space-x-4">
          <Link
            href="/portal"
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            返回首页
          </Link>
          <Link
            href="/portal/search"
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            搜索文章
          </Link>
        </div>
      </div>
    </div>
  );
}
