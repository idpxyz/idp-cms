# WebUser 个性化推荐修复总结

## 问题回顾

用户 tops（WebUser ID: 2）登录后，频道顺序没有个性化，仍然显示默认顺序。

## 根本原因

1. **用户模型错误**：系统使用的是 `apps.web_users.models.WebUser`（自定义用户模型），不是 Django 默认的 `auth.User`

2. **前端缺少登录用户 ID 设置**：`user-session.ts` 只生成匿名 ID，没有在用户登录后设置真实的 WebUser ID

3. **数据不匹配**：ClickHouse 中存储的 `user_id` 是匿名 ID，无法与 WebUser 关联

## 已完成的修复

### 1. 前端修改（`sites/lib/tracking/user-session.ts`）

#### 添加了两个新函数：

```typescript
/**
 * 设置登录用户ID（用户登录后调用）
 * @param webUserId - WebUser 的 ID 或 username
 */
export function setLoggedInUserId(webUserId: string | number): void {
  if (typeof window === "undefined") return;

  // 使用 webuser_ 前缀，避免与匿名ID混淆
  const userId = `webuser_${webUserId}`;

  // 存储到 localStorage
  localStorage.setItem("user_id", userId);

  // 存储到 cookie（SSR 可访问）
  document.cookie = `user_id=${userId}; path=/; max-age=${365 * 24 * 60 * 60}`;

  console.log(`✅ 已设置登录用户ID: ${userId}`);
}

/**
 * 清除登录用户ID（用户登出后调用）
 */
export function clearLoggedInUserId(): void {
  if (typeof window === "undefined") return;

  // 清除 localStorage
  localStorage.removeItem("user_id");

  // 清除 cookie
  document.cookie = "user_id=; path=/; max-age=0";

  // 重新生成匿名ID
  const newAnonymousId = generateUserId();
  console.log(`✅ 已清除登录用户ID，生成新的匿名ID: ${newAnonymousId}`);
}
```

#### 修改了 `generateUserId()`：

```typescript
function generateUserId(): string {
  if (typeof window === "undefined") return "";

  // 尝试从localStorage获取现有用户ID
  const existingUserId = localStorage.getItem("user_id");
  if (existingUserId) {
    // 同步到 cookie，让 SSR 也能使用
    document.cookie = `user_id=${existingUserId}; path=/; max-age=${365 * 24 * 60 * 60}`;
    return existingUserId;
  }

  // 生成新用户ID
  const userId =
    "user_" + Math.random().toString(36).substr(2, 12) + "_" + Date.now();
  localStorage.setItem("user_id", userId);
  // 同步到 cookie
  document.cookie = `user_id=${userId}; path=/; max-age=${365 * 24 * 60 * 60}`;
  return userId;
}
```

### 2. 后端修改（`apps/api/rest/anonymous_recommendation.py`）

#### 修改了 `is_logged_in_user()` 函数：

```python
def is_logged_in_user(self, user_id: str) -> bool:
    """判断是否是真实登录用户（非自动生成的匿名ID）"""
    if not user_id:
        return False
    
    # ✅ 登录用户ID格式：webuser_{id} 或 webuser_{username}
    if user_id.startswith('webuser_'):
        return True
    
    # 匿名ID格式：user_xxx_timestamp
    # 其他以 user_ 开头的都认为是匿名用户
    if user_id.startswith('user_'):
        return False
    
    # 兼容旧数据或其他格式，默认认为是匿名用户
    return False
```

### 3. 测试数据

已在 ClickHouse 中为 tops 用户（`webuser_2`）创建了测试数据：

```
总浏览数: 9
设备数: 2
频道数: 3

📊 各频道浏览统计:
   科技: 5 次浏览，2 台设备，平均停留 38.0s
   娱乐: 2 次浏览，1 台设备，平均停留 19.0s
   财经: 2 次浏览，1 台设备，平均停留 31.5s
```

## 后续需要做的事情

### 1. **集成到登录流程** ⚠️ 关键步骤

需要在用户登录成功后调用 `setLoggedInUserId()`。

#### 步骤：

1. 找到前端的登录组件或登录 API 处理逻辑
2. 在登录成功的回调中添加：

```typescript
import { setLoggedInUserId } from '@/lib/tracking/user-session';

// 登录 API 调用示例
async function handleLogin(username: string, password: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      // ✅ 关键：设置登录用户ID
      setLoggedInUserId(data.user.id); // 或 data.user.username

      // 其他登录后的操作...
      // 例如：跳转到首页、更新用户状态等
    }
  } catch (error) {
    console.error('登录失败:', error);
  }
}
```

3. 在登出逻辑中添加：

```typescript
import { clearLoggedInUserId } from '@/lib/tracking/user-session';

async function handleLogout() {
  // ✅ 清除登录用户ID
  clearLoggedInUserId();

  // 其他登出操作...
  // 例如：清除 token、跳转到登录页等
}
```

### 2. **测试完整流程**

#### a. 登录测试

1. 打开浏览器开发者工具（F12）
2. 打开控制台（Console）
3. 用户 tops 登录
4. 在控制台应该看到：
   ```
   ✅ 已设置登录用户ID: webuser_2
   ```
5. 验证存储：
   ```javascript
   // 在控制台执行
   localStorage.getItem('user_id')  // 应该返回 "webuser_2"
   document.cookie                  // 应该包含 "user_id=webuser_2"
   ```

#### b. 个性化测试

1. 登录后，浏览几篇科技频道的文章
2. 刷新页面
3. 科技频道应该排在靠前的位置（基于浏览历史）

#### c. 跨设备测试

1. 设备A：以 tops 登录，浏览科技频道
2. 设备B（或另一个浏览器）：以 tops 登录
3. 设备B 也应该看到科技频道排在前面（跨设备同步）

### 3. **验证 API 调用**

在浏览器的网络面板（Network）中检查 `/api/channels/personalized` 请求：

- Headers 应该包含：
  ```
  X-User-ID: webuser_2
  X-Device-ID: dev_xxx_xxx
  X-Session-ID: sess_xxx_xxx
  ```

- Response 应该包含：
  ```json
  {
    "channels": [...],
    "strategy": {
      "type": "personalized",
      "confidence": 0.75,
      "is_logged_in": true,
      "user_id": "webuser_2"
    }
  }
  ```

## 数据流

### 正确的流程：

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ 用户 tops 登录                                           │
│    ↓                                                        │
│ 2️⃣ 前端调用 setLoggedInUserId(2)                            │
│    localStorage.setItem('user_id', 'webuser_2')           │
│    document.cookie = 'user_id=webuser_2; ...'             │
│    ↓                                                        │
│ 3️⃣ 用户浏览文章，埋点数据发送到 ClickHouse                    │
│    INSERT INTO events VALUES                               │
│    ('view', 'webuser_2', 'dev_xxx', '科技', ...)          │
│    ↓                                                        │
│ 4️⃣ 前端请求个性化频道                                         │
│    GET /api/channels/personalized                          │
│    Cookie: user_id=webuser_2                               │
│    ↓                                                        │
│ 5️⃣ Next.js middleware 提取 cookie                           │
│    添加 X-User-ID: webuser_2 到请求头                        │
│    ↓                                                        │
│ 6️⃣ 后端 anonymous_recommendation.py                         │
│    get_user_id() -> 'webuser_2'                            │
│    is_logged_in_user('webuser_2') -> True                  │
│    ↓                                                        │
│ 7️⃣ 查询 ClickHouse（跨设备聚合）                             │
│    SELECT channel, COUNT(*) FROM events                    │
│    WHERE user_id = 'webuser_2'                             │
│    GROUP BY channel                                        │
│    ↓                                                        │
│ 8️⃣ 返回个性化频道顺序                                         │
│    科技（5次）→ 财经（2次）→ 娱乐（2次）→ ...              │
└─────────────────────────────────────────────────────────────┘
```

## 文件清单

### 修改的文件：

1. `/opt/idp-cms/sites/lib/tracking/user-session.ts`
   - 添加 `setLoggedInUserId()` 函数
   - 添加 `clearLoggedInUserId()` 函数
   - 修改 `generateUserId()` 同步到 cookie

2. `/opt/idp-cms/apps/api/rest/anonymous_recommendation.py`
   - 修改 `is_logged_in_user()` 识别 `webuser_` 前缀

### 新增的文件：

1. `/opt/idp-cms/PERSONALIZATION_LOGIN_ISSUE.md` - 问题诊断文档
2. `/opt/idp-cms/WEBUSER_PERSONALIZATION_SUMMARY.md` - 本文档
3. `/opt/idp-cms/test_webuser_personalization.py` - 测试脚本
4. `/opt/idp-cms/debug_webuser_recommendation.py` - 调试脚本

## 常见问题

### Q1: 为什么使用 `webuser_` 前缀？

**A:** 为了明确区分登录用户和匿名用户：
- 匿名用户：`user_abc123_1234567890`（自动生成）
- 登录用户：`webuser_2` 或 `webuser_tops`（真实用户）

### Q2: 为什么要同时存储到 localStorage 和 cookie？

**A:**
- `localStorage`：客户端 JavaScript 可以访问，用于前端埋点
- `cookie`：服务端 SSR 可以访问，用于服务端渲染时的个性化

### Q3: 如果用户在登录前已经浏览了一些文章怎么办？

**A:** 登录前的浏览记录使用匿名 ID 存储，登录后的记录使用 `webuser_` ID。未来可以考虑实现 ID 迁移功能，将匿名记录关联到登录用户。

### Q4: 跨设备同步是如何实现的？

**A:** 所有设备上的浏览记录都使用同一个 `user_id`（`webuser_2`），后端查询时会聚合这个用户在所有设备上的历史记录。

## 下一步

**立即执行：**
1. 找到前端登录组件
2. 添加 `setLoggedInUserId()` 调用
3. 测试登录流程
4. 验证个性化推荐是否生效

**需要帮助？**
- 如果不确定登录组件在哪里，搜索：`fetch.*login` 或 `login.*api`
- 如果需要示例代码，参考上面的 "集成到登录流程" 部分
