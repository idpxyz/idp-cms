# Channel与Category组织方案

**版本**: 1.0  
**日期**: 2024-10-20  
**状态**: 待确认

---

## 📋 执行摘要

本文档基于对新老数据库的深入分析，提出了一个科学的Channel（频道）和Category（分类）组织方案，用于将旧系统476个分类的内容迁移到新的Wagtail CMS系统。

### 核心问题
- 旧系统：476个复杂层级分类
- 新系统：仅6个简单频道
- 挑战：如何在不丢失信息的前提下重新组织内容？

### 推荐方案
**双维度结构** - 用Channel表示内容类型，用Category表示地理位置

---

## 🔍 数据分析

### 旧系统结构 (MySQL - 121.41.73.49)

```
数据库: jrhb
总分类: 476个
层级: 2-3层
顶级分类: 43个

主要维度:
├─ 内容维度 (30%): 新闻、经济、文化、体育、科技、教育等
└─ 地理维度 (70%): 武汉、黄石、十堰、荆州、宜昌等地方站
```

### 新系统现状 (PostgreSQL - 121.40.167.71)

```
当前Channel: 6个
├─ 民生 (foo)
├─ 社会 (society)  
├─ 科技 (tech)
├─ 财经 (finance)
├─ 体育 (sports)
└─ 娱乐 (entertainment)

当前Category: 0个
```

### 关键发现

| 维度 | 分类数 | 占比 | 说明 |
|------|--------|------|------|
| 地理维度 | ~330 | 69% | 各地市的地方性内容 |
| 内容维度 | ~100 | 21% | 按主题分类的内容 |
| 其他 | ~46 | 10% | 专题、活动等 |

**结论**: 旧系统本质上是**地理维度为主**的组织方式，而新系统设计是**内容维度为主**。

---

## 💡 推荐方案：双维度结构

### 设计理念

```
一篇文章 = 1个Channel（内容类型） + N个Category（地理/主题标签）
```

**示例**:
```
文章: "武汉东湖高新区出台人才新政"
├─ Channel: 新闻资讯 (内容类型)
└─ Categories: [湖北 > 武汉]（地理位置）
```

### Channel 结构 (8个频道)

| 序号 | 名称 | Slug | 包含内容 | 对应旧分类 |
|------|------|------|----------|-----------|
| 1 | 新闻资讯 | news | 时政、社会、法制、党建 | 1,2,3,5,6,12 |
| 2 | 经济财经 | finance | 金融、证券、房产、投资 | 4,7,8,9,10,11,28 |
| 3 | 文化娱乐 | culture | 文化、艺术、娱乐、书画 | 18,19,20,21,22,24 |
| 4 | 民生服务 | livelihood | 民生、健康、医疗、美食 | 13,14,15,16,17,41 |
| 5 | 体育运动 | sports | 体育相关 | 23 |
| 6 | 科技数码 | tech | 科技、互联网 | 26 |
| 7 | 教育培训 | education | 教育相关 | 27 |
| 8 | 汽车旅游 | auto-travel | 汽车、旅游 | 29,30 |

### Category 结构 (19个分类)

```
湖北 (hubei)
├─ 武汉 (wuhan)          - 省会，政治经济文化中心
├─ 襄阳 (xiangyang)      - 副中心城市
├─ 宜昌 (yichang)        - 副中心城市，三峡所在地
├─ 荆州 (jingzhou)       - 历史文化名城
├─ 黄石 (huangshi)       - 工业城市
├─ 十堰 (shiyan)         - 汽车城
├─ 黄冈 (huanggang)      - 教育大市
├─ 荆门 (jingmen)        - 地级市
├─ 鄂州 (ezhou)          - 地级市
├─ 孝感 (xiaogan)        - 地级市
├─ 咸宁 (xianning)       - 地级市
├─ 随州 (suizhou)        - 地级市
├─ 恩施 (enshi)          - 自治州
├─ 仙桃 (xiantao)        - 省直管市
├─ 潜江 (qianjiang)      - 省直管市
├─ 天门 (tianmen)        - 省直管市
└─ 神农架 (shennongjia)  - 林区

全国 (national)           - 非地方性的全国新闻
```

---

## 🎯 方案优势

### 1. 信息保留完整
- ✅ 内容类型信息 → Channel
- ✅ 地理位置信息 → Category
- ✅ 零信息丢失

### 2. 灵活且可扩展
- ✅ 一篇文章可以有多个Category标签
- ✅ 新增地区只需添加Category
- ✅ 新增内容类型只需添加Channel

### 3. 符合Wagtail设计
- ✅ Channel用于页面路由和导航
- ✅ Category用于内容筛选和标签
- ✅ 符合CMS最佳实践

### 4. 用户体验友好
```
前端导航:
首页 > 经济财经 > [武汉] 武汉楼市新政出台
       ↑           ↑      ↑
    Channel    Category  标题
```

---

## 📊 映射规则

### Channel映射

```python
# 旧分类ID -> 新Channel ID
CHANNEL_MAPPING = {
    # 新闻资讯
    1: 'news',    # 新闻
    2: 'news',    # 时政
    3: 'news',    # 党建
    5: 'news',    # 社会
    6: 'news',    # 法制
    12: 'news',   # 资讯
    
    # 经济财经
    4: 'finance',   # 金融
    7: 'finance',   # 经济
    8: 'finance',   # 证券
    9: 'finance',   # 理财
    10: 'finance',  # 商会
    11: 'finance',  # 投资
    28: 'finance',  # 房产
    
    # 文化娱乐
    18: 'culture',  # 文化
    21: 'culture',  # 娱乐
    22: 'culture',  # 艺术
    20: 'culture',  # 书画
    
    # 民生服务
    13: 'livelihood',  # 民生
    14: 'livelihood',  # 家居
    15: 'livelihood',  # 健康
    17: 'livelihood',  # 医疗
    41: 'livelihood',  # 美食
    
    # 体育运动
    23: 'sports',   # 体育
    
    # 科技数码
    26: 'tech',     # 科技
    
    # 教育培训
    27: 'education',  # 教育
    
    # 汽车旅游
    29: 'auto-travel',  # 汽车
    30: 'auto-travel',  # 旅游
}
```

### Category映射（地理）

```python
# 旧分类名称包含关键词 -> Category
CATEGORY_MAPPING = {
    '武汉': 'wuhan',
    '黄石': 'huangshi',
    '十堰': 'shiyan',
    '荆州': 'jingzhou',
    '宜昌': 'yichang',
    '襄阳': 'xiangyang',
    '鄂州': 'ezhou',
    '荆门': 'jingmen',
    '黄冈': 'huanggang',
    '孝感': 'xiaogan',
    '咸宁': 'xianning',
    '随州': 'suizhou',
    '恩施': 'enshi',
    '仙桃': 'xiantao',
    '潜江': 'qianjiang',
    '天门': 'tianmen',
    '神农架': 'shennongjia',
}
```

### 智能映射逻辑

```python
def map_article(old_article):
    """映射旧文章到新结构"""
    
    # 1. 根据分类ID确定Channel
    cate_id = old_article['cate_id']
    channel_slug = CHANNEL_MAPPING.get(cate_id, 'news')  # 默认新闻
    
    # 2. 根据分类名称确定Category
    cate_name = get_category_name(cate_id)
    categories = []
    
    for keyword, category_slug in CATEGORY_MAPPING.items():
        if keyword in cate_name:
            categories.append(category_slug)
            break
    
    # 如果没有匹配地理位置，默认为全国
    if not categories:
        categories = ['national']
    
    return {
        'channel': channel_slug,
        'categories': categories
    }
```

---

## 🚀 实施步骤

### 第1步：在新系统创建结构

```bash
# 运行自动化脚本
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py shell < scripts/setup_channels_categories.py
```

**预期结果**:
- 创建8个Channel
- 创建19个Category（含层级关系）

### 第2步：验证结构

```bash
# 在Django shell中验证
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell
```

```python
from apps.core.models import Channel, Category

# 查看Channel
for ch in Channel.objects.all().order_by('order'):
    print(f'{ch.order}. {ch.name} [{ch.slug}]')

# 查看Category树
for cat in Category.objects.filter(parent__isnull=True):
    print(f'\n{cat.name}')
    for child in cat.children.all().order_by('order'):
        print(f'  └─ {child.name}')
```

### 第3步：更新映射配置

编辑 `data/migration/category_mapping.json`，添加新的Channel和Category映射规则。

### 第4步：测试导入

```bash
# 导出测试数据
./scripts/export_articles_from_mysql.sh --limit 100

# 测试导入
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py import_old_articles --test --limit=10
```

### 第5步：验证结果

```python
from apps.news.models import ArticlePage
from django.db.models import Count

# 按Channel统计
ArticlePage.objects.values('channel__name').annotate(
    count=Count('id')
).order_by('-count')

# 按Category统计
ArticlePage.objects.filter(categories__isnull=False).values(
    'categories__name'
).annotate(count=Count('id')).order_by('-count')
```

### 第6步：正式导入

```bash
# 导出全部数据
./scripts/export_articles_from_mysql.sh

# 正式导入
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py import_old_articles --batch-size=1000
```

---

## 📈 预期效果

### 数据分布预测

基于旧系统的分类统计：

| Channel | 文章数 | 占比 |
|---------|--------|------|
| 新闻资讯 | ~65,000 | 36% |
| 经济财经 | ~45,000 | 25% |
| 文化娱乐 | ~30,000 | 17% |
| 民生服务 | ~25,000 | 14% |
| 汽车旅游 | ~8,000 | 4% |
| 教育培训 | ~3,000 | 2% |
| 体育运动 | ~1,500 | 1% |
| 科技数码 | ~400 | <1% |

| Category | 文章数 | 占比 |
|----------|--------|------|
| 武汉 | ~35,000 | 20% |
| 全国 | ~30,000 | 17% |
| 荆州 | ~18,000 | 10% |
| 宜昌 | ~15,000 | 8% |
| 其他地市 | ~80,000 | 45% |

---

## ⚠️ 注意事项

### 1. 历史数据处理
- 旧系统有些分类已废弃但仍有文章
- 建议映射到对应Channel，不分配Category

### 2. 专题内容
- 旧系统有大量专题分类
- 建议保留为普通文章，通过标签(tags)实现

### 3. 重复映射
- 某些文章可能同时属于多个地区
- 导入时可以关联多个Category

### 4. URL迁移
- 需要设置301重定向
- 保持SEO友好

---

## 🔄 替代方案对比

### 方案B：扁平化（不推荐）

**结构**: 只用8个Channel，不用Category

**优点**:
- 简单
- 实施快

**缺点**:
- ❌ 丢失地理信息
- ❌ 无法按地区筛选
- ❌ 不利于地方站运营

### 方案C：全量迁移（不推荐）

**结构**: 创建476个Category保留原结构

**优点**:
- 零信息丢失

**缺点**:
- ❌ 过于复杂
- ❌ 不符合新系统设计
- ❌ 用户体验差
- ❌ 维护成本高

---

## ✅ 决策建议

**推荐采用方案A（双维度结构）**，理由：

1. **信息完整性**: 保留了内容类型和地理信息
2. **系统设计**: 符合Wagtail CMS的设计理念
3. **用户体验**: 清晰的导航和筛选体验
4. **可维护性**: 结构清晰，易于扩展
5. **SEO友好**: 清晰的URL结构

**投入成本**:
- 开发时间: 2-3天
- 数据迁移: 1天
- 测试验证: 1天
- **总计**: ~5天

**长期收益**:
- ✓ 清晰的内容组织
- ✓ 灵活的扩展能力
- ✓ 良好的用户体验
- ✓ 便于运营维护

---

## 📚 相关文档

- [数据迁移总览](./MIGRATION_README.md)
- [快速开始指南](./data_migration_quickstart.md)
- [完整迁移方案](./data_migration_plan.md)
- [分类映射指南](./category_mapping_guide.md)

---

## 📞 反馈与讨论

如有疑问或建议，请：
1. 查看详细分析报告: `data/migration/database_analysis_report.json`
2. 检查现有分类: `data/migration/old_categories.txt`
3. 参考新系统结构: `data/migration/new_structure.json`

---

**审批**: □ 待确认  
**执行**: □ 待开始  
**完成**: □ 未完成

