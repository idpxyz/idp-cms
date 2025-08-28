import { CacheTag } from '@/components/CacheProvider';
import { CACHE_TAGS } from '@/lib/cache';

export default function TestCachePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">缓存测试页面</h1>

      <CacheTag tag={CACHE_TAGS.SITE('test')}>
        <div className="p-4 border rounded bg-blue-50">
          <h2>测试缓存标签</h2>
          <p>这个区域应该被缓存标签标记</p>
        </div>
      </CacheTag>

      <div className="mt-4 text-sm text-gray-600">
        <p>检查浏览器控制台查看缓存标签输出</p>
      </div>
    </div>
  );
}
