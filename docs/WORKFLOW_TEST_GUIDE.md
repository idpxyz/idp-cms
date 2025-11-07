# 🧪 工作流测试指南

## ✅ 配置验证结果

**验证时间**: 2024-11-07
**验证状态**: ✅ **所有配置正确！可以正常使用**

---

## 📋 配置摘要

### 工作流配置
- ✅ 工作流名称: `Moderators approval`
- ✅ 状态: 活跃
- ✅ 应用范围: 所有页面类型（包括文章）
- ✅ 审批任务: 组审批 (GroupApprovalTask)

### 用户权限配置
| 用户 | 所属组 | 发布权限 | 预期行为 |
|------|--------|----------|----------|
| **houad** | 专题教育编辑 | ❌ 无 | 只能提交审核 ✅ |
| **chensiyan** | Moderators | ✅ 有 | 可以审批发布 ✅ |
| **leo5122** | Moderators | ✅ 有 | 可以审批发布 ✅ |

---

## 🧪 快速测试步骤

### 测试 1: houad 提交文章审核

#### 步骤 1: 用 houad 登录
```
URL: http://8.133.22.7:8000/admin/
用户名: houad
密码: houad123456
```

#### 步骤 2: 创建新文章
1. 点击左侧 **"页面"** → **"今日湖北"**
2. 点击右上角 **"添加子页面"** → **"文章页面"**
3. 填写：
   - 标题: `测试工作流-{当前日期时间}`
   - 摘要: `这是一篇测试工作流的文章`
   - 频道: 选择 **教育健康** 或 **视频专题**
   - 正文: 随便写一些内容

#### 步骤 3: 检查提交按钮 ⭐ 关键
滚动到页面底部，检查右下角的按钮：

**✅ 正确情况**:
- 看到 **"提交审核"** 按钮（绿色/蓝色）
- 看到 **"保存草稿"** 按钮
- **没有** **"发布"** 按钮

**❌ 错误情况**:
- 看到 **"发布"** 按钮
- → 说明权限配置有问题，请联系管理员

#### 步骤 4: 提交审核
1. 点击 **"提交审核"** 按钮
2. 在弹出的对话框中确认
3. 观察页面顶部的通知消息
4. 应该显示：**"页面已提交至 'Moderators approval' 工作流"**

#### 步骤 5: 确认文章状态
1. 返回 **"页面"** 列表
2. 找到刚创建的文章
3. 应该看到状态标记：**⏳ 审核中** (In moderation)

---

### 测试 2: chensiyan 或 leo5122 审批文章

#### 步骤 1: 用审核人登录
```
URL: http://8.133.22.7:8000/admin/
用户名: chensiyan （或 leo5122）
密码: chensiyan123456 （或 leo5122123456）
```

#### 步骤 2: 查看待审核文章

**方法 A: 从仪表盘**
1. 登录后在首页仪表盘
2. 找到 **"待审核"** 或 **"Awaiting your review"** 区域
3. 应该能看到刚才提交的文章

**方法 B: 从页面列表**
1. 点击左侧 **"页面"** → **"今日湖北"**
2. 找到标记为 **⏳ 审核中** 的文章
3. 点击文章标题

#### 步骤 3: 审阅文章
1. 查看文章内容
2. 在页面右侧找到 **"工作流"** 面板
3. 应该看到：
   - 当前任务: **Moderators approval**
   - 提交人: **houad**
   - 提交时间

#### 步骤 4: 审批操作

**测试批准流程：**
1. 点击 **"批准"** (Approve) 按钮
2. （可选）填写审批意见
3. 点击确认
4. 观察页面顶部通知：**"工作流任务已批准"**
5. 文章应该自动发布，状态变为 **✅ 已发布** (Live)

**测试拒绝流程：**（可选，如果想完整测试）
1. 点击 **"拒绝"** (Reject) 按钮
2. **必须**填写拒绝理由，例如："标题需要修改"
3. 点击确认
4. 文章返回给编辑，状态变为 **❌ 已拒绝**

---

## 🎯 预期结果

### ✅ 测试通过的标志

1. **houad 操作**
   - ✅ 只看到 "提交审核" 按钮，没有 "发布" 按钮
   - ✅ 提交后文章进入 "审核中" 状态
   - ✅ 不能直接发布文章

2. **审核人操作**
   - ✅ 能看到待审核文章通知
   - ✅ 能看到 "批准" / "拒绝" / "添加评论" 按钮
   - ✅ 批准后文章自动发布
   - ✅ 拒绝后文章返回编辑

3. **工作流记录**
   - ✅ 能在 "历史" 标签中看到完整的审批记录
   - ✅ 记录包含：提交人、审批人、时间、意见

---

## ❌ 常见问题

### 问题 1: houad 看到 "发布" 按钮

**原因**: 权限配置可能被修改了

**解决**: 执行以下命令移除发布权限
```bash
ssh root@8.133.22.7 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring python manage.py shell" << 'EOF'
from django.contrib.auth.models import Group, Permission
group = Group.objects.get(name='专题教育编辑')
publish_perm = Permission.objects.get(codename='publish_page')
group.permissions.remove(publish_perm)
print("✅ 已移除发布权限")
EOF
```

### 问题 2: 审核人看不到待审核提示

**可能原因**:
1. 文章还是草稿，没有提交审核
2. 审核人不在 Moderators 组
3. 工作流未激活

**检查方法**:
```bash
# 检查用户组
ssh root@8.133.22.7 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring python manage.py shell" << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='chensiyan')
print("所属组:", [g.name for g in user.groups.all()])
EOF
```

### 问题 3: 提交审核后没有进入工作流

**检查工作流状态**:
```bash
ssh root@8.133.22.7 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring python manage.py shell" << 'EOF'
from wagtail.models import Workflow
wf = Workflow.objects.first()
print(f"工作流: {wf.name}")
print(f"活跃: {wf.active}")
EOF
```

---

## 📊 验证清单

在测试完成后，请确认以下各项：

- [ ] houad 只能看到 "提交审核" 按钮
- [ ] houad 提交后文章进入 "审核中" 状态
- [ ] chensiyan/leo5122 能看到待审核通知
- [ ] 审核人能够批准文章
- [ ] 批准后文章自动发布
- [ ] 审核人能够拒绝文章
- [ ] 拒绝后文章返回编辑
- [ ] 能在历史记录中看到审批信息
- [ ] houad 不能直接发布文章

---

## 🎉 测试成功后

如果所有测试都通过了，说明工作流配置完全正确！

### 下一步建议

1. **通知所有用户** 工作流已启用
2. **培训编辑** 如何提交审核
3. **培训审核人** 如何审批文章
4. **监控审批效率** 定期查看待审核数量

### 可选增强功能

如果需要更多功能，可以考虑：
- [ ] 邮件通知（审批状态变更时发送邮件）
- [ ] 多级审批（初审 → 终审）
- [ ] 定时发布（审批后定时发布）
- [ ] 审批统计报表
- [ ] 紧急文章快速通道

---

**测试指南结束** ✅
**需要帮助**: 查看 `/opt/idp-cms/docs/WORKFLOW_GUIDE.md` 获取完整使用指南

