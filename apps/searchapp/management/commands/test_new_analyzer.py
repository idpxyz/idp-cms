from django.core.management.base import BaseCommand
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import ARTICLE_MAPPING
import json

class Command(BaseCommand):
    help = "创建测试索引验证新的中文分析器效果"

    def add_arguments(self, parser):
        parser.add_argument("--text", default="中华人民共和国国务院发布重要通知", help="测试文本")

    def handle(self, *args, **options):
        test_text = options["text"]
        client = get_client()
        test_index = "test_chinese_analyzer"
        
        self.stdout.write(f"🧪 创建测试索引验证中文分析器")
        
        # 删除可能存在的测试索引
        try:
            if client.indices.exists(index=test_index):
                client.indices.delete(index=test_index)
                self.stdout.write("🗑️ 删除旧的测试索引")
        except Exception:
            pass
        
        # 创建新的测试索引
        try:
            client.indices.create(index=test_index, body=ARTICLE_MAPPING)
            self.stdout.write(self.style.SUCCESS(f"✅ 创建测试索引: {test_index}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 创建索引失败: {e}"))
            return
        
        # 测试分析器效果
        self.stdout.write(f"\n📝 测试文本: {test_text}")
        self.stdout.write("=" * 60)
        
        analyzers = [
            ("chinese_analyzer", "新的中文分析器"),
            ("chinese_search_analyzer", "新的中文搜索分析器"),
            ("standard", "标准分析器对比")
        ]
        
        for analyzer_name, desc in analyzers:
            self.stdout.write(f"\n🔧 {desc} ({analyzer_name}):")
            try:
                response = client.indices.analyze(
                    index=test_index,
                    body={
                        "analyzer": analyzer_name,
                        "text": test_text
                    }
                )
                
                tokens = [token["token"] for token in response["tokens"]]
                self.stdout.write(f"   分词结果: {' | '.join(tokens[:10])}")  # 只显示前10个词
                if len(tokens) > 10:
                    self.stdout.write(f"   (... 还有{len(tokens)-10}个词)")
                self.stdout.write(f"   总词数: {len(tokens)}")
                
                # 显示分词类型
                if len(tokens) > 0:
                    token_types = set(token["type"] for token in response["tokens"][:5])
                    self.stdout.write(f"   词汇类型: {', '.join(token_types)}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ 分析失败: {e}"))
        
        # 测试搜索效果
        self.stdout.write(f"\n🔍 测试搜索匹配效果:")
        self.stdout.write("-" * 40)
        
        # 添加一个测试文档
        test_doc = {
            "article_id": "test001",
            "title": "中华人民共和国国务院关于重要政策的通知",
            "summary": "这是一个测试文档，包含中文分词测试内容",
            "body": "国务院发布了关于改革开放的重要通知文件",
            "site": "localhost"
        }
        
        try:
            client.index(index=test_index, id="test001", body=test_doc)
            client.indices.refresh(index=test_index)  # 刷新索引
            self.stdout.write("📄 添加测试文档成功")
            
            # 测试不同的搜索查询
            test_queries = [
                ("国务院", "单词搜索"),
                ("重要通知", "词组搜索"),
                ("政策文件", "跨字段搜索")
            ]
            
            for query_text, query_desc in test_queries:
                self.stdout.write(f"\n🔎 {query_desc}: '{query_text}'")
                
                search_body = {
                    "query": {
                        "multi_match": {
                            "query": query_text,
                            "fields": ["title^3", "summary^2", "body"],
                            "type": "best_fields"
                        }
                    }
                }
                
                try:
                    result = client.search(index=test_index, body=search_body)
                    hits = result["hits"]["total"]["value"]
                    if hits > 0:
                        max_score = result["hits"]["max_score"]
                        self.stdout.write(f"   ✅ 匹配: {hits} 个文档, 最高评分: {max_score:.3f}")
                    else:
                        self.stdout.write(f"   ❌ 无匹配")
                except Exception as e:
                    self.stdout.write(f"   ❌ 搜索失败: {e}")
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 添加测试文档失败: {e}"))
        
        # 显示索引配置
        self.stdout.write(f"\n📋 测试索引配置:")
        self.stdout.write("-" * 40)
        try:
            settings = client.indices.get_settings(index=test_index)
            analyzers = settings[test_index]["settings"]["index"]["analysis"]["analyzer"]
            self.stdout.write(f"   配置的分析器: {list(analyzers.keys())}")
            
            for name, config in analyzers.items():
                self.stdout.write(f"   {name}: type={config.get('type', 'unknown')}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 获取配置失败: {e}"))
        
        # 清理测试索引
        self.stdout.write(f"\n🧹 清理测试索引...")
        try:
            client.indices.delete(index=test_index)
            self.stdout.write("✅ 测试索引已删除")
        except Exception:
            pass
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("🎯 测试完成！")
        
        self.stdout.write("\n💡 如果新配置效果满意，可以运行以下命令应用到生产索引:")
        self.stdout.write("   python manage.py reindex_all_articles --site localhost --clear")
        self.stdout.write("\n⚠️  注意：重建索引会暂时清空现有数据，建议在低峰期执行")
