# 🧪 前端登录测试指南

## 📋 准备工作

### 1. 确认服务运行
```bash
cd /opt/idp-cms
docker compose -f infra/local/docker-compose.yml ps
```

应该看到：
- ✅ authoring 容器运行中
- ✅ sites 容器运行中（端口 3001）

### 2. 访问地址
**前端地址：** http://localhost:3001

---

## 🎯 测试步骤

### Step 1: 打开浏览器

1. 打开浏览器（Chrome/Firefox/Edge）
2. 访问 http://localhost:3001
3. 按 **F12** 打开开发者工具
4. 切换到 **Console（控制台）** 标签

### Step 2: 查看当前状态（登录前）

在控制台输入：
```javascript
localStorage.getItem('user_id')
```

应该看到一个匿名 ID（如 `"user_abc123_1234567890"`）

### Step 3: 登录 tops 账号

1. 点击页面上的 **登录** 按钮
2. 输入：
   - 邮箱/用户名：`tops@idp.com` 或 `tops`
   - 密码：（你设置的密码）
3. 点击 **登录**

### Step 4: 验证登录成功 ✅

**在控制台应该看到：**
```
✅ 用户 tops 登录成功，已设置个性化ID
✅ 已设置登录用户ID: webuser_2
```

### Step 5: 验证存储

在控制台执行：
```javascript
// 1. 检查 localStorage
localStorage.getItem('user_id')
// 应该返回: "webuser_2" ✅

// 2. 检查 cookie
document.cookie
// 应该包含: "user_id=webuser_2" ✅

// 3. 检查用户信息
localStorage.getItem('auth_user')
// 应该包含 tops 的用户信息 ✅
```

### Step 6: 检查网络请求

1. 切换到 **Network（网络）** 标签
2. 刷新页面（F5）
3. 找到 `/api/channels/personalized` 请求
4. 点击查看：
   - **Request Headers** 应该包含：
     ```
     X-User-ID: webuser_2
     X-Device-ID: dev_xxx_xxx
     X-Session-ID: sess_xxx_xxx
     ```
   - **Response** 应该返回频道列表

### Step 7: 浏览文章

1. 点击进入几篇**科技频道**的文章
2. 在每篇文章停留 30 秒以上
3. 浏览 3-5 篇科技文章

### Step 8: 验证个性化

1. 刷新页面（F5）
2. 查看频道导航栏的顺序
3. **科技频道应该逐渐靠前**（可能需要浏览更多文章）

### Step 9: 测试登出

1. 点击 **登出** 按钮
2. 控制台应该看到：
   ```
   ✅ 用户已登出，已恢复匿名ID
   ✅ 已清除登录用户ID，生成新的匿名ID: user_xyz789_...
   ```
3. 验证：
   ```javascript
   localStorage.getItem('user_id')
   // 应该是新的匿名ID，不再是 "webuser_2"
   ```

### Step 10: 跨设备测试（可选）

1. 打开**另一个浏览器**（或无痕模式）
2. 访问 http://localhost:3001
3. 用 tops 账号登录
4. 应该看到**相同的个性化频道顺序**（跨设备同步）

---

## ✅ 成功标志

如果看到以下所有现象，说明集成成功：

- [x] 登录后控制台显示 "已设置登录用户ID: webuser_2"
- [x] `localStorage.getItem('user_id')` 返回 `"webuser_2"`
- [x] Cookie 中包含 `user_id=webuser_2`
- [x] 网络请求包含 `X-User-ID: webuser_2`
- [x] 登出后 user_id 变回匿名ID
- [x] 重新登录后又变回 `webuser_2`

---

## 🐛 常见问题

### Q1: 登录后没有看到控制台消息

**原因：** 可能是浏览器缓存了旧代码

**解决：**
```bash
# 重启 sites 容器
docker compose -f infra/local/docker-compose.yml restart sites

# 等待容器启动完成（约 10 秒）
docker compose -f infra/local/docker-compose.yml logs sites --tail=50
```

然后在浏览器：
1. 按 Ctrl+Shift+Delete 清除缓存
2. 或者按 Ctrl+Shift+R 硬刷新

### Q2: localStorage.getItem('user_id') 还是匿名ID

**检查步骤：**

1. 确认登录成功（页面显示用户名）
2. 查看控制台是否有 JavaScript 错误
3. 检查 `AuthContext.tsx` 的修改是否生效：
   ```bash
   docker compose -f infra/local/docker-compose.yml exec sites cat /app/lib/context/AuthContext.tsx | grep -A 2 "setLoggedInUserId"
   ```

### Q3: 频道顺序没有变化

**说明：**
- 这是预期的（后端排序还需要调试）
- 但前端集成已经成功了
- 继续浏览更多文章，产生更多数据
- 后端会逐步改进

### Q4: 找不到登录按钮

**位置：**
- 通常在页面右上角
- 或者访问 `/portal/login` 路径

---

## 📊 测试数据

### 当前 tops 用户的数据（ClickHouse）

```
user_id: webuser_2
总浏览: 9 次
设备数: 2

频道分布:
  科技: 5 次 (56%)
  娱乐: 2 次 (22%)
  财经: 2 次 (22%)
```

### 建议测试行为

为了更好地测试个性化推荐，建议：

1. **浏览科技频道** - 再浏览 5-10 篇科技文章
2. **浏览财经频道** - 浏览 3-5 篇财经文章
3. **停留时间** - 每篇文章停留 30-60 秒
4. **刷新页面** - 每浏览几篇文章后刷新一次

---

## 🎉 下一步

前端测试通过后：

1. ✅ 确认前端集成完全正常
2. ✅ 确认 user_id 正确传递
3. ✅ 继续使用系统，产生更多数据
4. 🔧 后续可以慢慢调试后端排序逻辑

**核心功能已经可用！** 🚀
