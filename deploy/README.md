# 📦 部署工具包

完整的部署、运维和管理工具集。

---

## 📂 目录结构

```
deploy/
├── scripts/              # 可执行脚本
│   ├── configure-site.sh
│   ├── create-wagtail-site.sh
│   ├── generate-nginx-config.sh
│   ├── setup-ssl.sh
│   ├── monitor.sh
│   ├── backup.sh
│   └── restore.sh
│
├── docs/                 # 文档
│   ├── guides/          # 操作指南
│   ├── reports/         # 测试报告
│   └── references/      # 技术参考
│
├── templates/           # 配置模板
│
└── README.md           # 本文件
```

---

## 🛠️ 脚本工具

### 部署工具

| 脚本 | 功能 | 用途 |
|-----|------|------|
| `configure-site.sh` | 站点配置器 | 自动配置站点信息（品牌、域名、主题） |
| `create-wagtail-site.sh` | Wagtail站点创建 | 在数据库中创建新站点 |
| `generate-nginx-config.sh` | Nginx配置生成器 | 自动生成反向代理配置 |
| `setup-ssl.sh` | SSL自动配置 | 使用Let's Encrypt申请SSL证书 |

### 运维工具

| 脚本 | 功能 | 用途 |
|-----|------|------|
| `monitor.sh` | 系统监控 | 全面监控容器、资源和服务状态 |
| `backup.sh` | 自动备份 | 备份数据库、媒体文件和配置 |
| `restore.sh` | 数据恢复 | 从备份恢复数据 |

---

## 📚 文档分类

### guides/ - 操作指南

完整的部署和运维指南文档。

| 文档 | 说明 | 适用场景 |
|-----|------|---------|
| `QUICK_START.md` | 快速开始（15分钟） | 快速部署新站点 |
| `DEPLOYMENT_PLAN.md` | 详细部署计划（33任务） | 完整规划部署流程 |
| `DEPLOY_SECOND_HOST.md` | 第二台主机部署指南 | 独立主机部署 |
| `OPERATIONS_TOOLKIT.md` | 运维工具箱手册 | 工具详细使用说明 |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | 生产环境部署指南 | 生产环境部署 |
| `MULTI_SITE_DEPLOYMENT_GUIDE.md` | 多站点部署方案 | 多站点架构选择 |

### reports/ - 测试报告

工具测试结果和系统监控报告。

| 文档 | 说明 |
|-----|------|
| `TOOLS_TEST_REPORT.md` | 工具测试报告 |
| `monitor-report-*.txt` | 系统监控报告 |

### references/ - 技术参考

技术实现细节和架构说明。

| 文档 | 说明 |
|-----|------|
| `ADAPTIVE_LAYOUT_OPTIMIZATION.md` | 响应式布局优化 |
| `PORT_MAPPING_EXPLAINED.md` | 端口映射说明 |
| `MIGRATION_TO_SHARED.md` | 共享基础设施迁移 |
| `SHARED_INFRASTRUCTURE_GUIDE.md` | 共享基础设施指南 |
| `WHY_NO_AUTO_INSTALL.md` | 依赖管理机制 |
| `FRONTEND_BUILD_PROCESS.md` | 前端构建流程 |

---

## 🚀 快速开始

### 新站点部署（15分钟）

```bash
cd /opt/idp-cms/deploy

# 1. 配置站点
./scripts/configure-site.sh

# 2. 启动服务
cd ..
./start-production.sh

# 3. 创建站点
cd deploy
./scripts/create-wagtail-site.sh aivoya "AI旅行门户" aivoya.travel

# 4. 配置 Nginx
./scripts/generate-nginx-config.sh

# 5. 配置 SSL
./scripts/setup-ssl.sh aivoya.travel www.aivoya.travel
```

**详细步骤：** 查看 `docs/guides/QUICK_START.md`

---

### 日常运维

```bash
cd /opt/idp-cms/deploy/scripts

# 系统监控
./monitor.sh

# 执行备份
./backup.sh

# 数据恢复
./restore.sh ../backups/cms-20251011_143025
```

---

## 📖 推荐阅读顺序

### 首次部署

1. `docs/guides/QUICK_START.md` - 快速了解流程
2. `docs/guides/DEPLOYMENT_PLAN.md` - 详细部署计划
3. `docs/guides/OPERATIONS_TOOLKIT.md` - 工具详细说明

### 日常运维

1. `docs/guides/OPERATIONS_TOOLKIT.md` - 工具使用手册
2. `docs/reports/TOOLS_TEST_REPORT.md` - 最佳实践

### 故障排查

1. `docs/guides/DEPLOYMENT_PLAN.md` - 查看回滚方案
2. `docs/guides/DEPLOY_SECOND_HOST.md` - 故障排查章节

### 架构决策

1. `docs/guides/MULTI_SITE_DEPLOYMENT_GUIDE.md` - 多站点方案对比
2. `docs/references/SHARED_INFRASTRUCTURE_GUIDE.md` - 共享vs独立

---

## 🔧 使用技巧

### 1. 设置脚本别名

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias deploy-config='cd /opt/idp-cms/deploy/scripts && ./configure-site.sh'
alias deploy-monitor='cd /opt/idp-cms/deploy/scripts && ./monitor.sh'
alias deploy-backup='cd /opt/idp-cms/deploy/scripts && ./backup.sh'
```

### 2. 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加以下行
0 * * * * cd /opt/idp-cms/deploy/scripts && ./monitor.sh >> /var/log/cms-monitor.log 2>&1
0 2 * * * cd /opt/idp-cms/deploy/scripts && ./backup.sh >> /var/log/cms-backup.log 2>&1
```

### 3. 查看帮助

所有脚本都支持 `--help` 参数：

```bash
cd /opt/idp-cms/deploy/scripts
./configure-site.sh --help
./monitor.sh --help
./backup.sh --help
```

---

## 📊 工具特性

### ✅ 自动化

- 一键配置站点
- 自动生成 Nginx 配置
- 自动申请 SSL 证书
- 自动备份数据

### ✅ 安全可靠

- 自动备份机制
- 完整回滚方案
- 错误处理完善
- 操作前确认

### ✅ 易于使用

- 交互式引导
- 详细帮助文档
- 清晰错误提示
- 彩色输出标记

### ✅ 生产就绪

- 所有工具已测试
- 监控告警完善
- 备份恢复完整
- 标准化流程

---

## 🆘 获取帮助

### 查看文档

```bash
# 列出所有文档
ls deploy/docs/guides/
ls deploy/docs/references/

# 阅读文档
cat deploy/docs/guides/QUICK_START.md
cat deploy/docs/guides/OPERATIONS_TOOLKIT.md
```

### 查看测试报告

```bash
cat deploy/docs/reports/TOOLS_TEST_REPORT.md
```

### 查看脚本

```bash
# 列出所有脚本
ls -lh deploy/scripts/

# 查看脚本内容
cat deploy/scripts/configure-site.sh
```

---

## 📞 技术支持

如遇问题，请参考：

1. **操作指南：** `docs/guides/OPERATIONS_TOOLKIT.md`
2. **部署计划：** `docs/guides/DEPLOYMENT_PLAN.md`
3. **测试报告：** `docs/reports/TOOLS_TEST_REPORT.md`

---

## 📝 版本历史

| 版本 | 日期 | 说明 |
|-----|------|------|
| 1.0 | 2025-10-11 | 初始版本，完整工具集 |

---

## 📄 许可证

内部使用工具，请勿外传。

---

**最后更新：** 2025-10-11  
**维护团队：** DevOps Team

