#!/usr/bin/env python
"""
爬虫API测试脚本

用于测试爬虫数据写入API的功能是否正常
"""

import os
import sys
import requests
import json
from datetime import datetime, timezone

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class CrawlerAPITester:
    def __init__(self, base_url, api_key, client_name):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key,
            'X-API-Client': client_name
        }
    
    def test_site_info(self, site_hostname):
        """测试获取站点信息"""
        print(f"\n🔍 测试获取站点信息: {site_hostname}")
        
        url = f"{self.base_url}/api/crawler/sites/info"
        params = {'site': site_hostname}
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print("✅ 站点信息获取成功:")
                print(f"   站点名称: {data['site']['site_name']}")
                print(f"   频道数量: {len(data['channels'])}")
                print(f"   地区数量: {len(data['regions'])}")
                return data
            else:
                print(f"❌ 请求失败: {response.status_code}")
                print(f"   错误信息: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 请求异常: {str(e)}")
            return None
    
    def test_check_duplicates(self, site_hostname, test_articles):
        """测试重复检查"""
        print(f"\n🔍 测试重复文章检查")
        
        url = f"{self.base_url}/api/crawler/articles/check-duplicates"
        data = {
            'site': site_hostname,
            'articles': test_articles
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ 重复检查成功:")
                for i, res in enumerate(result['results']):
                    status = "重复" if res['is_duplicate'] else "不重复"
                    print(f"   文章 {i+1}: {status}")
                return result
            else:
                print(f"❌ 请求失败: {response.status_code}")
                print(f"   错误信息: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 请求异常: {str(e)}")
            return None
    
    def test_bulk_create(self, site_hostname, test_articles, dry_run=True):
        """测试批量创建文章"""
        mode = "试运行" if dry_run else "实际创建"
        print(f"\n🔍 测试批量创建文章 ({mode})")
        
        url = f"{self.base_url}/api/crawler/articles/bulk"
        data = {
            'site': site_hostname,
            'articles': test_articles,
            'update_existing': True,
            'dry_run': dry_run
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            
            if response.status_code in [200, 201]:
                result = response.json()
                print(f"✅ 批量操作成功:")
                print(f"   处理文章数: {result['summary']['total']}")
                if not dry_run:
                    print(f"   创建: {result['summary']['created']}")
                    print(f"   更新: {result['summary']['updated']}")
                    print(f"   错误: {result['summary']['errors']}")
                return result
            else:
                print(f"❌ 请求失败: {response.status_code}")
                print(f"   错误信息: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 请求异常: {str(e)}")
            return None
    
    def run_full_test(self, site_hostname):
        """运行完整测试流程"""
        print("🚀 开始爬虫API完整功能测试")
        print("="*50)
        
        # 准备测试数据
        now = datetime.now(timezone.utc).isoformat()
        test_articles = [
            {
                "title": f"爬虫API测试文章 - {now[:19]}",
                "body": "<p>这是一篇通过爬虫API创建的测试文章。</p><p>用于验证API功能是否正常工作。</p>",
                "excerpt": "爬虫API测试文章摘要",
                "author_name": "API测试程序",
                "channel": "测试",
                "language": "zh-CN",
                "topic_slug": "api-test",
                "external_article_url": f"https://test-source.com/article/{now[:10]}",
                "external_site": {
                    "domain": "test-source.com",
                    "name": "测试源站"
                },
                "publish_at": now,
                "has_video": False,
                "allow_aggregate": True,
                "is_featured": False,
                "weight": 0,
                "tags": ["API", "测试", "爬虫"],
                "live": False  # 测试时不发布
            }
        ]
        
        # 测试步骤1: 获取站点信息
        site_info = self.test_site_info(site_hostname)
        if not site_info:
            print("\n❌ 站点信息获取失败，终止测试")
            return False
        
        # 测试步骤2: 检查重复
        self.test_check_duplicates(site_hostname, test_articles)
        
        # 测试步骤3: 试运行创建
        dry_result = self.test_bulk_create(site_hostname, test_articles, dry_run=True)
        if not dry_result:
            print("\n❌ 试运行失败，终止测试")
            return False
        
        # 测试步骤4: 实际创建（可选）
        print(f"\n❓ 是否要执行实际创建操作？(y/N): ", end="")
        confirm = input().strip().lower()
        
        if confirm in ['y', 'yes']:
            actual_result = self.test_bulk_create(site_hostname, test_articles, dry_run=False)
            if actual_result and actual_result['summary']['created'] > 0:
                print("\n✅ 所有测试通过！爬虫API功能正常。")
                print("⚠️  注意：测试文章已创建但未发布，可在后台管理界面查看。")
            else:
                print("\n❌ 实际创建失败")
                return False
        else:
            print("\n✅ 试运行测试通过！爬虫API基本功能正常。")
        
        print("\n🎉 测试完成！")
        return True


def main():
    """主函数"""
    print("爬虫API测试工具")
    print("="*50)
    
    # 配置参数
    BASE_URL = os.getenv('CMS_BASE_URL', 'http://localhost:8000')
    API_KEY = os.getenv('CRAWLER_API_KEY', 'test-api-key')
    CLIENT_NAME = os.getenv('CRAWLER_CLIENT_NAME', 'api_tester')
    SITE_HOSTNAME = os.getenv('TEST_SITE_HOSTNAME', 'localhost:8000')
    
    print(f"测试配置:")
    print(f"  CMS地址: {BASE_URL}")
    print(f"  客户端名称: {CLIENT_NAME}")
    print(f"  目标站点: {SITE_HOSTNAME}")
    print(f"  API密钥: {'*' * len(API_KEY)}")
    
    # 创建测试客户端
    tester = CrawlerAPITester(BASE_URL, API_KEY, CLIENT_NAME)
    
    # 运行测试
    success = tester.run_full_test(SITE_HOSTNAME)
    
    if success:
        print("\n✅ 测试结果: 通过")
        sys.exit(0)
    else:
        print("\n❌ 测试结果: 失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
