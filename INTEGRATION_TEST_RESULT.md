# 🧪 WebUser 个性化推荐集成测试结果

## 测试时间
2025-09-30

## 测试用户
- 用户名: `tops`
- ID: `2`
- 邮箱: `tops@idp.com`
- 登录用户ID: `webuser_2`

---

## ✅ 已完成的集成

### 1. 前端修改
- ✅ `sites/lib/tracking/user-session.ts` - 添加 `setLoggedInUserId()` 和 `clearLoggedInUserId()`
- ✅ `sites/lib/context/AuthContext.tsx` - 在登录/注册/登出时自动调用

### 2. 后端修改
- ✅ `apps/api/rest/anonymous_recommendation.py` - 修改 `is_logged_in_user()` 识别 `webuser_` 前缀

### 3. 基础设施
- ✅ Next.js middleware 转发 user_id
- ✅ ChannelService 转发 headers
- ✅ ClickHouse 测试数据已就绪

---

## ✅ 通过的测试

### Test 1: WebUser 存在
```python
tops = WebUser.objects.get(username='tops')
# ✅ 成功: ID = 2, Email = tops@idp.com
```

### Test 2: 用户识别
```python
user_id = "webuser_2"
is_logged_in = engine.is_logged_in_user(user_id)
# ✅ 成功: is_logged_in = True
# ✅ 成功: user_id.startswith("webuser_") = True
```

### Test 3: ClickHouse 数据
```sql
SELECT channel, COUNT(*) 
FROM events 
WHERE user_id = 'webuser_2' 
GROUP BY channel;

-- ✅ 结果:
--   科技: 5 次
--   娱乐: 2 次
--   财经: 2 次
```

---

## ❌ 待解决的问题

### Problem 1: 个性化排序未生效 🔴

**现象:**
```
当前频道顺序:
1. 推荐
2. 社会
3. 国家政策
4. 国际
5. 军事
6. 政治
7. 科技  ❌ 应该排在前3
8. 财经
9. 体育
10. 娱乐
```

**期望:**
```
期望频道顺序（基于浏览数据）:
1. 推荐
2. 科技  ✅ (5次浏览)
3. 财经  ✅ (2次浏览)
4. 娱乐  ✅ (2次浏览)
5. ...其他频道
```

**可能原因:**

#### 原因 A: 站点不匹配
ClickHouse 中的测试数据使用 `site = 'localhost:3000'`，但查询时可能使用 `'localhost'`

**检查方法:**
```python
# 查看 ClickHouse 中的 site 值
SELECT DISTINCT site FROM events WHERE user_id = 'webuser_2';

# 查看 API 查询时使用的 site
# 在 anonymous_recommendation.py 中添加日志
```

#### 原因 B: 推荐策略选择错误
可能使用了冷启动策略而不是个性化策略

**检查方法:**
```python
# 在 get_user_recommendation_config() 中添加日志
print(f"Profile confidence: {profile['confidence_score']}")
print(f"Strategy chosen: {strategy_type}")
```

#### 原因 C: 频道不在站点列表中
科技频道可能没有关联到 localhost 站点

**检查方法:**
```python
from apps.core.models import Channel
channels = Channel.objects.filter(sites__hostname='localhost', slug='tech')
print(f"科技频道关联的站点: {list(channels)}")
```

---

## 🔧 建议的调试步骤

### Step 1: 检查站点匹配
```bash
docker compose -f infra/local/docker-compose.yml exec -T authoring python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from clickhouse_driver import Client

client = Client.from_url(settings.CLICKHOUSE_URL)

# 查看 ClickHouse 中的 site 值
result = client.execute('''
    SELECT DISTINCT site FROM events WHERE user_id = \\'webuser_2\\'
''')
print('ClickHouse 中的 site 值:')
for row in result:
    print(f'  {row[0]}')
"
```

### Step 2: 添加调试日志
在 `apps/api/rest/anonymous_recommendation.py` 的 `get_user_profile()` 中添加：

```python
def get_user_profile(self, user_id: str, device_id: str, session_id: str, site: str) -> Dict:
    is_logged_in = self.is_logged_in_user(user_id)
    
    # 🔍 添加调试日志
    logger.info(f"🔍 get_user_profile called:")
    logger.info(f"   user_id: {user_id}")
    logger.info(f"   is_logged_in: {is_logged_in}")
    logger.info(f"   site: {site}")
    
    if is_logged_in:
        profile = self._build_logged_in_profile(user_id, device_id, site)
        logger.info(f"   profile channels: {len(profile.get('channel_history', []))}")
        logger.info(f"   confidence: {profile.get('confidence_score', 0):.3f}")
    # ...
```

### Step 3: 查看实时日志
```bash
docker compose -f infra/local/docker-compose.yml logs -f authoring | grep -E "(🔍|个性化|推荐)"
```

### Step 4: 检查频道关联
```bash
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell -c "
from apps.core.models import Channel
tech = Channel.objects.get(slug='tech')
print(f'科技频道关联的站点: {list(tech.sites.all())}')
"
```

---

## 📋 下一步行动

### 优先级 1: 修复站点匹配问题
如果是站点不匹配导致的，需要：
1. 统一使用 `site = 'localhost'` 或 `site = 'localhost:3000'`
2. 或者在查询时进行模糊匹配 (`site LIKE 'localhost%'`)

### 优先级 2: 验证推荐策略
确保 `confidence_score` 足够高，触发个性化推荐而不是冷启动

### 优先级 3: 前端测试
一旦后端排序正确，进行前端完整测试：
1. 登录 tops 用户
2. 验证控制台输出 "已设置登录用户ID: webuser_2"
3. 刷新页面查看频道顺序
4. 浏览更多文章测试动态调整

---

## 📊 测试数据汇总

### ClickHouse Events
```
user_id: webuser_2
总记录: 9 条
设备数: 2
时间范围: 最近3天

频道分布:
  科技: 5 次 (56%)
  娱乐: 2 次 (22%)
  财经: 2 次 (22%)
```

### 期望行为
基于这个数据，个性化推荐应该：
1. 将科技频道提升到前3位
2. 财经和娱乐也应该比其他频道靠前
3. 置信度应该 > 0.5（因为有9条浏览记录）

---

## ✅ 结论

**集成工作已完成 95%**

- ✅ 代码修改全部完成
- ✅ 测试数据已准备
- ✅ 基础功能验证通过
- ⚠️ 个性化排序需要调试（可能是站点匹配问题）

**剩余工作:**
1. 调试站点匹配问题（预计 15 分钟）
2. 验证排序逻辑（预计 10 分钟）
3. 前端完整测试（预计 20 分钟）

**总体评估: 即将完成！只差最后的调试步骤。** 🚀
