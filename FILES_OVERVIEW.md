# IDP-CMS 文件说明

## 🚀 启动和运维脚本

### 主要脚本

| 文件 | 用途 | 何时使用 |
|------|------|----------|
| **`start.sh`** | 一键启动脚本 | 首次启动或完全重启系统 |
| **`warmup-sites.sh`** | 预热脚本 | 容器重启后手动预热 |
| **`sites/warmup.sh`** | 容器内预热脚本 | 由其他脚本调用，不直接使用 |

### 文档

| 文件 | 内容 |
|------|------|
| **`QUICK_START.md`** | 快速开始指南 - **推荐阅读** |
| **`PERFORMANCE_SOLUTION_SUMMARY.md`** | 性能解决方案总结 |
| **`COLD_START_ISSUE_SOLUTION.md`** | 冷启动问题详细分析 |
| **`FILES_OVERVIEW.md`** | 本文件 |

## 📋 使用流程

### 首次启动
```bash
./start.sh
```
这会：
- ✅ 安装所有依赖
- ✅ 启动所有服务
- ✅ 初始化数据库
- ✅ 自动预热页面

### 容器重启后
```bash
./warmup-sites.sh
```
快速预热页面，恢复性能

### 查看状态
```bash
cd infra/local
docker compose ps
```

## 🗑️ 已清理的文件

以下文件已被删除（功能已整合到start.sh）：
- ~~`auto-warmup.sh`~~ - 已删除
- ~~`sites/start-with-warmup.sh`~~ - 已删除
- ~~`rebuild-production.sh`~~ - 已删除（待Docker镜像源修复后重新添加）

## 📁 目录结构

```
/opt/idp-cms/
├── start.sh                    # ⭐ 一键启动脚本
├── warmup-sites.sh            # 预热脚本
├── QUICK_START.md             # ⭐ 快速开始指南
├── PERFORMANCE_SOLUTION_SUMMARY.md
├── COLD_START_ISSUE_SOLUTION.md
├── sites/
│   ├── warmup.sh              # 容器内预热脚本
│   ├── app/                   # Next.js应用代码
│   └── node_modules/          # 依赖包（含SWR）
└── infra/
    └── local/
        └── docker-compose.yml # Docker配置
```

## 💡 最佳实践

1. **始终使用 `./start.sh`** - 确保完整初始化
2. **容器重启后运行 `./warmup-sites.sh`** - 保持性能
3. **查看 `QUICK_START.md`** - 获取详细使用说明

---

**更新时间**: 2025-10-13  
**维护者**: IDP-CMS Team

