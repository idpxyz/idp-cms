from django.core.management.base import BaseCommand
from django.conf import settings
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name, ensure_index, update_mapping_if_needed
import json

class Command(BaseCommand):
    help = "测试中文分词效果并验证分析器配置"

    def add_arguments(self, parser):
        parser.add_argument("--site", default=None, help="指定站点，默认使用SITE_HOSTNAME")
        parser.add_argument("--text", default="中华人民共和国国务院发布重要通知", help="测试文本")
        parser.add_argument("--update-mapping", action="store_true", help="更新索引映射")

    def handle(self, *args, **options):
        site = options["site"] or settings.SITE_HOSTNAME
        test_text = options["text"]
        update_mapping = options["update_mapping"]
        
        self.stdout.write(f"🔍 测试中文分词效果 - 站点: {site}")
        
        # 确保索引存在
        index_name = ensure_index(site)
        client = get_client()
        
        # 更新映射（如果需要）
        if update_mapping:
            self.stdout.write("🔄 更新索引映射...")
            success = update_mapping_if_needed(site)
            if success:
                self.stdout.write(self.style.SUCCESS("✅ 映射更新成功"))
            else:
                self.stdout.write(self.style.WARNING("⚠️ 映射更新失败"))
        
        # 测试不同分析器的效果
        analyzers = [
            ("chinese_analyzer", "中文分析器（索引用）"),
            ("chinese_search_analyzer", "中文搜索分析器"),
            ("standard", "标准分析器（对比）")
        ]
        
        self.stdout.write(f"\n📝 测试文本: {test_text}")
        self.stdout.write("=" * 60)
        
        for analyzer_name, analyzer_desc in analyzers:
            self.stdout.write(f"\n🔧 {analyzer_desc} ({analyzer_name}):")
            
            try:
                # 使用分析器分析文本
                response = client.indices.analyze(
                    index=index_name,
                    body={
                        "analyzer": analyzer_name,
                        "text": test_text
                    }
                )
                
                tokens = [token["token"] for token in response["tokens"]]
                self.stdout.write(f"   分词结果: {' | '.join(tokens)}")
                self.stdout.write(f"   词数: {len(tokens)}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ 分析失败: {e}"))
        
        # 测试搜索查询效果
        self.stdout.write(f"\n🔍 测试搜索查询效果:")
        self.stdout.write("-" * 40)
        
        # 创建测试查询
        search_queries = [
            {
                "name": "多字段中文分词搜索",
                "query": {
                    "multi_match": {
                        "query": "国务院 通知",
                        "fields": ["title^5", "summary^2", "body"],
                        "type": "best_fields"
                    }
                }
            },
            {
                "name": "短语匹配搜索",
                "query": {
                    "multi_match": {
                        "query": "重要通知",
                        "fields": ["title^5", "summary^2", "body"],
                        "type": "phrase"
                    }
                }
            }
        ]
        
        for search_test in search_queries:
            self.stdout.write(f"\n🔎 {search_test['name']}:")
            try:
                # 执行搜索查询（只获取总数，不返回具体结果）
                response = client.search(
                    index=index_name,
                    body={
                        "query": search_test["query"],
                        "size": 0,
                        "track_total_hits": True
                    }
                )
                
                total_hits = response["hits"]["total"]["value"]
                self.stdout.write(f"   查询语句: {json.dumps(search_test['query'], ensure_ascii=False)}")
                self.stdout.write(f"   匹配文档数: {total_hits}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ 搜索失败: {e}"))
        
        # 输出配置信息
        self.stdout.write(f"\n📋 当前索引配置:")
        self.stdout.write("-" * 40)
        try:
            mapping = client.indices.get_mapping(index=index_name)
            index_settings = client.indices.get_settings(index=index_name)
            
            # 显示分析器配置
            analyzers_config = index_settings[index_name]["settings"]["index"].get("analysis", {}).get("analyzer", {})
            self.stdout.write(f"   配置的分析器: {list(analyzers_config.keys())}")
            
            # 显示主要字段的分析器设置
            properties = mapping[index_name]["mappings"]["properties"]
            for field in ["title", "summary", "body"]:
                if field in properties:
                    field_config = properties[field]
                    analyzer = field_config.get("analyzer", "默认")
                    search_analyzer = field_config.get("search_analyzer", "默认")
                    self.stdout.write(f"   {field}: 索引分析器={analyzer}, 搜索分析器={search_analyzer}")
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ 获取配置失败: {e}"))
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("🎯 测试完成！")
        self.stdout.write("\n💡 如果需要应用新的分析器配置，请运行:")
        self.stdout.write("   python manage.py reindex_all_articles --site your_site --clear")
