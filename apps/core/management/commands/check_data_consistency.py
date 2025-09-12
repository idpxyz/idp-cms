#!/usr/bin/env python3
"""
数据一致性检查器 - 验证Wagtail与OpenSearch之间的数据一致性

用法：
  python manage.py check_data_consistency
  python manage.py check_data_consistency --site=aivoya.com
  python manage.py check_data_consistency --fix-auto
"""

from django.core.management.base import BaseCommand
from django.db import connection
from wagtail.models import Site
from apps.news.models import ArticlePage
from apps.searchapp.client import get_client
from apps.searchapp.alias import read_alias
from apps.core.site_utils import normalize_site_identifier
import json


class Command(BaseCommand):
    help = "检查和验证Wagtail与OpenSearch之间的数据一致性"

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            help='检查特定站点的数据一致性',
        )
        parser.add_argument(
            '--fix-auto',
            action='store_true',
            help='自动修复发现的数据不一致问题',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='显示详细的检查信息',
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        self.fix_auto = options['fix_auto']
        target_site = options.get('site')

        self.stdout.write("🔍 开始数据一致性检查...")
        
        # 检查Wagtail站点配置
        site_issues = self.check_wagtail_sites()
        
        # 检查站点数据对应关系
        if target_site:
            consistency_issues = self.check_site_consistency(target_site)
        else:
            consistency_issues = self.check_all_sites_consistency()
        
        # 检查OpenSearch索引状态
        index_issues = self.check_opensearch_indices()
        
        # 生成报告
        self.generate_report(site_issues, consistency_issues, index_issues)
        
        if self.fix_auto:
            self.auto_fix_issues(site_issues, consistency_issues, index_issues)

    def check_wagtail_sites(self):
        """检查Wagtail站点配置问题"""
        self.stdout.write("\n=== Wagtail站点配置检查 ===")
        
        issues = []
        sites = Site.objects.all()
        
        # 检查站点根页面重复
        root_pages = {}
        for site in sites:
            root_id = site.root_page_id
            if root_id in root_pages:
                issue = {
                    'type': 'duplicate_root_page',
                    'severity': 'high',
                    'message': f'站点 {site.hostname} 与 {root_pages[root_id]} 共享根页面 {root_id}',
                    'sites': [site.hostname, root_pages[root_id]],
                    'root_page_id': root_id
                }
                issues.append(issue)
                self.stdout.write(self.style.ERROR(f"❌ {issue['message']}"))
            else:
                root_pages[root_id] = site.hostname
                if self.verbose:
                    self.stdout.write(f"✅ 站点 {site.hostname} 根页面 {root_id} 正常")
        
        # 检查站点数据分布
        for site in sites:
            article_count = ArticlePage.objects.live().descendant_of(site.root_page).count()
            if self.verbose:
                self.stdout.write(f"📊 站点 {site.hostname}: {article_count} 篇文章")
            
            if article_count == 0 and site.hostname != 'localhost':
                issue = {
                    'type': 'empty_site',
                    'severity': 'medium',
                    'message': f'站点 {site.hostname} 没有文章内容',
                    'site': site.hostname,
                    'article_count': 0
                }
                issues.append(issue)
                self.stdout.write(self.style.WARNING(f"⚠️  {issue['message']}"))
        
        return issues

    def check_site_consistency(self, site_identifier):
        """检查特定站点的数据一致性"""
        self.stdout.write(f"\n=== 站点 {site_identifier} 数据一致性检查 ===")
        
        issues = []
        
        try:
            # 获取Wagtail数据
            wagtail_data = self.get_wagtail_site_data(site_identifier)
            
            # 获取OpenSearch数据
            opensearch_data = self.get_opensearch_site_data(site_identifier)
            
            # 比较数据一致性
            consistency_check = self.compare_site_data(
                site_identifier, wagtail_data, opensearch_data
            )
            issues.extend(consistency_check)
            
        except Exception as e:
            issue = {
                'type': 'check_error',
                'severity': 'high',
                'message': f'检查站点 {site_identifier} 时出错: {str(e)}',
                'site': site_identifier,
                'error': str(e)
            }
            issues.append(issue)
            self.stdout.write(self.style.ERROR(f"❌ {issue['message']}"))
        
        return issues

    def check_all_sites_consistency(self):
        """检查所有站点的数据一致性"""
        self.stdout.write("\n=== 全站数据一致性检查 ===")
        
        all_issues = []
        sites = Site.objects.all()
        
        for site in sites:
            site_issues = self.check_site_consistency(site.hostname)
            all_issues.extend(site_issues)
        
        return all_issues

    def get_wagtail_site_data(self, site_identifier):
        """获取Wagtail中的站点数据"""
        try:
            site = Site.objects.get(hostname=site_identifier)
            articles = ArticlePage.objects.live().descendant_of(site.root_page)
            
            return {
                'site_id': site.id,
                'hostname': site.hostname,
                'root_page_id': site.root_page_id,
                'article_count': articles.count(),
                'articles': [
                    {
                        'id': article.id,
                        'title': article.title,
                        'publish_time': article.first_published_at.isoformat() if article.first_published_at else None
                    }
                    for article in articles[:10]  # 只取前10个作为样本
                ]
            }
        except Site.DoesNotExist:
            return None

    def get_opensearch_site_data(self, site_identifier):
        """获取OpenSearch中的站点数据"""
        try:
            client = get_client()
            normalized_site = normalize_site_identifier(site_identifier)
            index = read_alias(normalized_site)
            
            # 查询站点数据
            query = {
                "query": {"term": {"site": site_identifier}},
                "size": 0,  # 只要统计信息
                "aggs": {
                    "total_articles": {"value_count": {"field": "article_id"}},
                    "sample_articles": {
                        "top_hits": {
                            "size": 10,
                            "_source": ["article_id", "title", "publish_time", "site"]
                        }
                    }
                }
            }
            
            result = client.search(index=index, body=query)
            total_count = result['hits']['total']['value']
            sample_articles = []
            
            if 'aggregations' in result and 'sample_articles' in result['aggregations']:
                hits = result['aggregations']['sample_articles']['hits']['hits']
                sample_articles = [
                    {
                        'id': hit['_source']['article_id'],
                        'title': hit['_source']['title'],
                        'site': hit['_source']['site'],
                        'publish_time': hit['_source'].get('publish_time')
                    }
                    for hit in hits
                ]
            
            return {
                'index': index,
                'site_identifier': site_identifier,
                'normalized_site': normalized_site,
                'article_count': total_count,
                'articles': sample_articles
            }
            
        except Exception as e:
            return {'error': str(e)}

    def compare_site_data(self, site_identifier, wagtail_data, opensearch_data):
        """比较Wagtail和OpenSearch的站点数据"""
        issues = []
        
        if not wagtail_data:
            issue = {
                'type': 'wagtail_site_missing',
                'severity': 'high',
                'message': f'Wagtail中未找到站点 {site_identifier}',
                'site': site_identifier
            }
            issues.append(issue)
            self.stdout.write(self.style.ERROR(f"❌ {issue['message']}"))
            return issues
        
        if 'error' in opensearch_data:
            issue = {
                'type': 'opensearch_error',
                'severity': 'high',
                'message': f'OpenSearch查询站点 {site_identifier} 出错: {opensearch_data["error"]}',
                'site': site_identifier,
                'error': opensearch_data['error']
            }
            issues.append(issue)
            self.stdout.write(self.style.ERROR(f"❌ {issue['message']}"))
            return issues
        
        # 比较文章数量
        wagtail_count = wagtail_data['article_count']
        opensearch_count = opensearch_data['article_count']
        
        if wagtail_count != opensearch_count:
            issue = {
                'type': 'article_count_mismatch',
                'severity': 'medium',
                'message': f'站点 {site_identifier} 文章数量不匹配: Wagtail({wagtail_count}) vs OpenSearch({opensearch_count})',
                'site': site_identifier,
                'wagtail_count': wagtail_count,
                'opensearch_count': opensearch_count
            }
            issues.append(issue)
            self.stdout.write(self.style.WARNING(f"⚠️  {issue['message']}"))
        else:
            self.stdout.write(f"✅ 站点 {site_identifier} 文章数量一致: {wagtail_count}")
        
        # 检查站点标识符一致性
        opensearch_sites = set()
        for article in opensearch_data.get('articles', []):
            opensearch_sites.add(article.get('site'))
        
        if opensearch_sites and site_identifier not in opensearch_sites:
            issue = {
                'type': 'site_identifier_mismatch',
                'severity': 'high',
                'message': f'OpenSearch中站点标识符不匹配: 期望 {site_identifier}, 实际 {opensearch_sites}',
                'site': site_identifier,
                'expected': site_identifier,
                'actual': list(opensearch_sites)
            }
            issues.append(issue)
            self.stdout.write(self.style.ERROR(f"❌ {issue['message']}"))
        
        return issues

    def check_opensearch_indices(self):
        """检查OpenSearch索引状态"""
        self.stdout.write("\n=== OpenSearch索引状态检查 ===")
        
        issues = []
        
        try:
            client = get_client()
            
            # 获取所有索引
            indices = client.cat.indices(format='json')
            news_indices = [idx for idx in indices if 'news_' in idx['index']]
            
            if self.verbose:
                self.stdout.write(f"📊 找到 {len(news_indices)} 个新闻索引:")
                for idx in news_indices:
                    self.stdout.write(f"  - {idx['index']}: {idx['docs.count']} 文档")
            
            # 检查索引健康状态
            for idx in news_indices:
                if idx['health'] != 'green':
                    issue = {
                        'type': 'index_health',
                        'severity': 'medium' if idx['health'] == 'yellow' else 'high',
                        'message': f'索引 {idx["index"]} 健康状态: {idx["health"]}',
                        'index': idx['index'],
                        'health': idx['health']
                    }
                    issues.append(issue)
                    self.stdout.write(self.style.WARNING(f"⚠️  {issue['message']}"))
                else:
                    if self.verbose:
                        self.stdout.write(f"✅ 索引 {idx['index']} 健康状态正常")
            
        except Exception as e:
            issue = {
                'type': 'opensearch_connection_error',
                'severity': 'high',
                'message': f'连接OpenSearch失败: {str(e)}',
                'error': str(e)
            }
            issues.append(issue)
            self.stdout.write(self.style.ERROR(f"❌ {issue['message']}"))
        
        return issues

    def generate_report(self, site_issues, consistency_issues, index_issues):
        """生成检查报告"""
        self.stdout.write("\n" + "="*60)
        self.stdout.write("📋 数据一致性检查报告")
        self.stdout.write("="*60)
        
        all_issues = site_issues + consistency_issues + index_issues
        
        if not all_issues:
            self.stdout.write(self.style.SUCCESS("🎉 未发现数据一致性问题！"))
            return
        
        # 按严重程度分类
        high_issues = [i for i in all_issues if i['severity'] == 'high']
        medium_issues = [i for i in all_issues if i['severity'] == 'medium']
        low_issues = [i for i in all_issues if i['severity'] == 'low']
        
        self.stdout.write(f"🔍 总计发现 {len(all_issues)} 个问题:")
        self.stdout.write(f"  🔴 严重: {len(high_issues)}")
        self.stdout.write(f"  🟡 中等: {len(medium_issues)}")
        self.stdout.write(f"  🟢 轻微: {len(low_issues)}")
        
        # 详细问题列表
        if high_issues:
            self.stdout.write("\n🔴 严重问题:")
            for issue in high_issues:
                self.stdout.write(f"  - {issue['message']}")
        
        if medium_issues:
            self.stdout.write("\n🟡 中等问题:")
            for issue in medium_issues:
                self.stdout.write(f"  - {issue['message']}")
        
        # 保存详细报告到文件
        report_data = {
            'timestamp': self.get_timestamp(),
            'summary': {
                'total_issues': len(all_issues),
                'high_severity': len(high_issues),
                'medium_severity': len(medium_issues),
                'low_severity': len(low_issues)
            },
            'issues': all_issues
        }
        
        report_file = 'data_consistency_report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(f"\n📄 详细报告已保存到: {report_file}")

    def auto_fix_issues(self, site_issues, consistency_issues, index_issues):
        """自动修复可修复的问题"""
        self.stdout.write("\n🔧 开始自动修复...")
        
        # 这里可以实现自动修复逻辑
        # 目前只是框架，具体修复逻辑根据需要实现
        self.stdout.write("⚠️  自动修复功能正在开发中...")

    def get_timestamp(self):
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().isoformat()
