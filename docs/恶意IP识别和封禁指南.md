# 🕵️ 恶意IP识别和封禁指南

## 📋 目录
1. [快速使用](#快速使用)
2. [识别恶意IP](#识别恶意ip)
3. [封禁管理](#封禁管理)
4. [当前封禁列表](#当前封禁列表)
5. [自动化防护](#自动化防护)

---

## 快速使用

### 分析恶意IP

```bash
# 运行完整分析
/opt/idp-cms/infra/production/analyze-malicious-ips.sh

# 实时监控（每5分钟刷新）
watch -n 300 /opt/idp-cms/infra/production/analyze-malicious-ips.sh
```

### 管理封禁IP

```bash
# 查看已封禁的IP
/opt/idp-cms/infra/production/manage-blocked-ips.sh list

# 添加IP到封禁列表
/opt/idp-cms/infra/production/manage-blocked-ips.sh add 1.2.3.4 "DDoS攻击"

# 移除IP
/opt/idp-cms/infra/production/manage-blocked-ips.sh remove 1.2.3.4

# 查看操作日志
/opt/idp-cms/infra/production/manage-blocked-ips.sh log
```

---

## 识别恶意IP

### 恶意IP的特征

**1. 高频请求**
- 每分钟 > 10次请求
- 短时间大量连接
- 忽略robots.txt

**2. 高404率**
- 404错误 > 50%
- 尝试访问不存在的路径
- 扫描常见漏洞路径：
  - `/admin/`
  - `/wp-admin/`
  - `/phpmyadmin/`
  - `/.env`
  - `/.git/`

**3. 可疑User-Agent**
- 空User-Agent
- 伪装的User-Agent
- 已知恶意爬虫：
  - `MJ12bot`
  - `AhrefsBot`
  - `SemrushBot`
  - `python-requests`
  - `curl`
  - `wget`

**4. 异常行为**
- 使用PUT/DELETE等方法
- 频繁触发速率限制（429）
- 被爬虫黑名单阻止（403）

### 分析工具输出解读

```bash
📊 1. 请求频率最高的Top 20 IP
----------------------------------------
127    ✓   39.144.244.124  (2.1 req/min)
        ↑       ↑                ↑
      次数    标记          每分钟请求数

标记说明：
✓      - 正常 (< 5 req/min)
⚠️ 可疑 - 可疑 (5-10 req/min)
🚨 高频 - 高频 (> 10 req/min)
```

---

## 封禁管理

### 当前封禁的IP（2025-11-07）

| IP地址 | 原因 | 封禁时间 |
|--------|------|----------|
| `39.144.244.124` | 大量404扫描（70/127次） | 2025-11-07 |
| `85.208.96.206` | 恶意爬虫 | 2025-11-07 |
| `85.208.96.200` | 恶意爬虫 | 2025-11-07 |
| `185.191.171.14` | 恶意爬虫 | 2025-11-07 |

### 封禁IP的方法

#### 方法1：使用管理工具（推荐）

```bash
# 添加单个IP
/opt/idp-cms/infra/production/manage-blocked-ips.sh add 1.2.3.4 "扫描漏洞"

# 批量添加
echo "1.2.3.4" > /tmp/bad_ips.txt
echo "5.6.7.8" >> /tmp/bad_ips.txt
/opt/idp-cms/infra/production/manage-blocked-ips.sh batch /tmp/bad_ips.txt
```

#### 方法2：手动编辑配置文件

```bash
# 编辑封禁列表
vim /etc/nginx/conf.d/blocked-ips.conf

# 添加IP
deny 1.2.3.4;
deny 5.6.7.8;

# 测试配置
nginx -t

# 重载nginx
systemctl reload nginx
```

### 解除封禁

```bash
# 使用管理工具
/opt/idp-cms/infra/production/manage-blocked-ips.sh remove 1.2.3.4

# 或手动编辑
vim /etc/nginx/conf.d/blocked-ips.conf
# 删除对应的 deny 行
nginx -t && systemctl reload nginx
```

---

## 自动化防护

### 1. 自动分析和报告

添加每天的分析报告：

```bash
# 编辑crontab
crontab -e

# 添加：每天早上9点发送分析报告
0 9 * * * /opt/idp-cms/infra/production/analyze-malicious-ips.sh > /tmp/ip-report.txt && cat /tmp/ip-report.txt
```

### 2. 自动清理连接

已配置：每5分钟检查连接数，超过100自动重启nginx

```bash
# 查看定时任务
crontab -l | grep auto-clean

# 查看日志
tail -f /var/log/nginx-auto-clean.log
```

### 3. 实时监控

```bash
# 实时查看访问日志
tail -f /var/log/nginx/8.133.22.7-access.log

# 实时查看可疑请求
tail -f /var/log/nginx/8.133.22.7-access.log | grep -E '(403|429|404)'

# 实时查看高频IP
watch -n 5 "tail -1000 /var/log/nginx/8.133.22.7-access.log | awk '{print \$1}' | sort | uniq -c | sort -rn | head -10"
```

---

## 常见场景处理

### 场景1：发现新的攻击IP

```bash
# 1. 运行分析
/opt/idp-cms/infra/production/analyze-malicious-ips.sh

# 2. 查看建议封禁的IP
# （脚本会自动标记高度可疑IP）

# 3. 封禁IP
/opt/idp-cms/infra/production/manage-blocked-ips.sh add IP地址 "攻击原因"
```

### 场景2：误封正常用户

```bash
# 1. 查看封禁列表
/opt/idp-cms/infra/production/manage-blocked-ips.sh list

# 2. 解除封禁
/opt/idp-cms/infra/production/manage-blocked-ips.sh remove IP地址

# 3. 查看日志确认
tail /var/log/nginx-ip-blocks.log
```

### 场景3：大规模DDoS攻击

```bash
# 1. 立即重启nginx清理连接
systemctl restart nginx

# 2. 降低速率限制（临时）
vim /etc/nginx/conf.d/protection.conf
# 将 rate=5r/s 改为 rate=2r/s

# 3. 降低并发连接
vim /etc/nginx/sites-available/default
# 将 limit_conn conn_limit 5 改为 limit_conn conn_limit 3

# 4. 重载配置
nginx -t && systemctl reload nginx

# 5. 分析并批量封禁
/opt/idp-cms/infra/production/analyze-malicious-ips.sh
# 将高频IP批量添加到封禁列表
```

### 场景4：合法爬虫被误判

**常见合法爬虫：**
- Googlebot: `66.249.*.*`
- Bingbot: `40.77.*.*`, `52.167.*.*`
- Baiduspider: 百度爬虫

**解决方法：**

```bash
# 方法1：从黑名单移除特定User-Agent
vim /etc/nginx/conf.d/protection.conf
# 注释掉对应的行

# 方法2：为合法爬虫添加白名单
vim /etc/nginx/conf.d/protection.conf

# 添加：
map $http_user_agent $is_good_bot {
    default 0;
    ~*Googlebot 1;
    ~*bingbot 1;
    ~*Baiduspider 1;
}

# 在站点配置中：
if ($is_good_bot) {
    set $is_bad_bot 0;  # 覆盖黑名单判断
}
```

---

## 统计和报告

### 查看防护效果

```bash
# 1. 被阻止的爬虫数量
tail -10000 /var/log/nginx/8.133.22.7-access.log | grep ' 403 ' | wc -l

# 2. 触发速率限制的次数
tail -10000 /var/log/nginx/8.133.22.7-access.log | grep ' 429 ' | wc -l

# 3. 当前连接数
netstat -an | grep ':80 ' | grep ESTABLISHED | wc -l

# 4. 封禁的IP数量
/opt/idp-cms/infra/production/manage-blocked-ips.sh list | wc -l
```

### 生成每日报告

```bash
cat << 'EOF' > /opt/idp-cms/infra/production/daily-security-report.sh
#!/bin/bash
echo "=========================================="
echo "每日安全报告 - $(date '+%Y-%m-%d')"
echo "=========================================="
echo ""
echo "1. 封禁IP数量："
/opt/idp-cms/infra/production/manage-blocked-ips.sh list | wc -l
echo ""
echo "2. 昨日被阻止请求："
tail -50000 /var/log/nginx/8.133.22.7-access.log | grep ' 403 ' | wc -l
echo ""
echo "3. 昨日速率限制触发："
tail -50000 /var/log/nginx/8.133.22.7-access.log | grep ' 429 ' | wc -l
echo ""
echo "4. 当前活跃连接："
netstat -an | grep ':80 ' | grep ESTABLISHED | wc -l
echo ""
echo "5. Top 5 访问IP："
tail -10000 /var/log/nginx/8.133.22.7-access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -5
echo ""
EOF

chmod +x /opt/idp-cms/infra/production/daily-security-report.sh
```

---

## 配置文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| 封禁IP列表 | `/etc/nginx/conf.d/blocked-ips.conf` | nginx配置 |
| 速率限制配置 | `/etc/nginx/conf.d/protection.conf` | 速率限制规则 |
| 站点配置 | `/etc/nginx/sites-available/default` | 主配置文件 |
| 分析工具 | `/opt/idp-cms/infra/production/analyze-malicious-ips.sh` | IP分析脚本 |
| 管理工具 | `/opt/idp-cms/infra/production/manage-blocked-ips.sh` | 封禁管理脚本 |
| 自动清理 | `/opt/idp-cms/infra/production/auto-clean-connections.sh` | 连接清理脚本 |
| 访问日志 | `/var/log/nginx/8.133.22.7-access.log` | nginx访问日志 |
| 封禁日志 | `/var/log/nginx-ip-blocks.log` | IP封禁操作日志 |
| 清理日志 | `/var/log/nginx-auto-clean.log` | 自动清理日志 |

---

## 常用命令速查

```bash
# 分析恶意IP
/opt/idp-cms/infra/production/analyze-malicious-ips.sh

# 查看封禁列表
/opt/idp-cms/infra/production/manage-blocked-ips.sh list

# 封禁IP
/opt/idp-cms/infra/production/manage-blocked-ips.sh add IP "原因"

# 解除封禁
/opt/idp-cms/infra/production/manage-blocked-ips.sh remove IP

# 查看当前连接
netstat -an | grep ':80 ' | grep ESTABLISHED | wc -l

# 重启nginx（清理连接）
systemctl restart nginx

# 实时监控流量
watch -n 5 /opt/idp-cms/infra/production/monitor-traffic.sh

# 查看封禁日志
tail -f /var/log/nginx-ip-blocks.log

# 查看自动清理日志
tail -f /var/log/nginx-auto-clean.log
```

---

## 最佳实践

1. **定期分析**：每天至少运行一次分析脚本
2. **谨慎封禁**：确认IP确实恶意后再封禁
3. **记录原因**：封禁时添加详细原因便于追踪
4. **定期审查**：每周检查封禁列表，移除过期的
5. **监控日志**：定期查看自动清理和封禁日志
6. **备份配置**：修改配置前先备份
7. **测试配置**：修改后务必运行 `nginx -t`
8. **保留合法爬虫**：不要封禁Google、Bing等搜索引擎

---

## 故障排查

### 问题1：nginx配置测试失败

```bash
# 查看详细错误
nginx -t

# 检查语法
cat /etc/nginx/conf.d/blocked-ips.conf

# 恢复备份
cp /etc/nginx/sites-available/default.backup-* /etc/nginx/sites-available/default
```

### 问题2：封禁不生效

```bash
# 1. 确认配置加载
grep "include.*blocked-ips" /etc/nginx/sites-available/default

# 2. 测试配置
nginx -t

# 3. 重载nginx
systemctl reload nginx

# 4. 查看日志
tail -f /var/log/nginx/8.133.22.7-access.log | grep "被封禁的IP"
```

### 问题3：误封正常用户

```bash
# 立即解除封禁
/opt/idp-cms/infra/production/manage-blocked-ips.sh remove IP地址

# 或临时禁用整个封禁文件
mv /etc/nginx/conf.d/blocked-ips.conf /etc/nginx/conf.d/blocked-ips.conf.disabled
systemctl reload nginx
```

---

*最后更新：2025-11-07*
*版本：v1.0*

