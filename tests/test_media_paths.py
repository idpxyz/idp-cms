"""
媒体路径生成器测试
"""
from datetime import datetime
from django.test import TestCase
from unittest.mock import Mock, patch
from wagtail.models import Collection
from apps.core.media_paths import (
    build_media_path, 
    build_temp_media_path,
    get_site_from_collection_name,
    validate_media_path
)


class MediaPathsTestCase(TestCase):
    """测试媒体路径生成功能"""
    
    def setUp(self):
        """设置测试数据"""
        self.test_filename = "test_image.jpg"
        self.mock_instance = Mock()
    
    def test_build_media_path_default(self):
        """测试默认媒体路径生成"""
        # 模拟没有特殊属性的实例
        path = build_media_path(self.mock_instance, self.test_filename)
        
        # 验证路径格式
        parts = path.split('/')
        self.assertEqual(len(parts), 7)  # tenant/site/collection/year/month/category/filename
        self.assertEqual(parts[0], "aivoya")  # tenant
        self.assertEqual(parts[1], "portal")  # 默认站点
        self.assertEqual(parts[2], "default")  # 默认集合
        self.assertEqual(parts[5], "originals")  # 默认分类
        self.assertTrue(parts[6].endswith(".jpg"))  # 文件扩展名
    
    def test_build_media_path_with_collection(self):
        """测试带集合信息的路径生成"""
        # 模拟带集合的实例
        mock_collection = Mock()
        mock_collection.name = "Beijing Media"
        self.mock_instance.collection = mock_collection
        
        path = build_media_path(self.mock_instance, self.test_filename)
        
        parts = path.split('/')
        self.assertEqual(parts[1], "beijing")  # 从集合名推断站点
        self.assertEqual(parts[2], "beijing-media")  # 集合名转换为slug
    
    def test_build_media_path_with_request(self):
        """测试带请求信息的路径生成"""
        # 模拟带请求的实例
        mock_request = Mock()
        self.mock_instance._request = mock_request
        
        with patch('apps.core.media_paths.get_site_from_request') as mock_get_site:
            mock_get_site.return_value = "shanghai"
            
            path = build_media_path(self.mock_instance, self.test_filename)
            
            parts = path.split('/')
            self.assertEqual(parts[1], "shanghai")  # 从请求中获取的站点
    
    def test_build_media_path_year_month(self):
        """测试年月路径生成"""
        with patch('apps.core.media_paths.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 3, 15)
            mock_datetime.isoformat = datetime.isoformat
            
            path = build_media_path(self.mock_instance, self.test_filename)
            
            parts = path.split('/')
            self.assertEqual(parts[3], "2025")  # 年份
            self.assertEqual(parts[4], "03")    # 月份
    
    def test_build_temp_media_path(self):
        """测试临时文件路径生成"""
        path = build_temp_media_path(self.mock_instance, self.test_filename)
        
        parts = path.split('/')
        self.assertEqual(parts[0], "aivoya")  # tenant
        self.assertEqual(parts[1], "portal")  # 默认站点
        self.assertEqual(parts[2], "tmp")     # 临时目录标识
        self.assertTrue(parts[6].endswith(".jpg"))  # 文件扩展名
    
    def test_get_site_from_collection_name(self):
        """测试从集合名称推断站点"""
        test_cases = [
            ("Beijing Media", "beijing"),
            ("Shanghai News", "shanghai"),
            ("Hangzhou Local", "hangzhou"),
            ("Shenzhen Channel", "shenzhen"),
            ("Portal Content", "portal"),
            ("Unknown Collection", "portal"),  # 默认值
            ("", "portal"),  # 空字符串
            (None, "portal"),  # None值
        ]
        
        for collection_name, expected_site in test_cases:
            with self.subTest(collection_name=collection_name):
                result = get_site_from_collection_name(collection_name)
                self.assertEqual(result, expected_site)
    
    def test_validate_media_path(self):
        """测试媒体路径验证"""
        valid_paths = [
            "aivoya/portal/default/2025/01/originals/abc123.jpg",
            "aivoya/beijing/images/2024/12/renditions/def456.png",
            "aivoya/shanghai/docs/2025/03/transcodes/ghi789.pdf",
        ]
        
        invalid_paths = [
            "",  # 空路径
            "aivoya/portal",  # 路径太短
            "aivoya/portal/default/25/01/originals/test.jpg",  # 年份格式错误
            "aivoya/portal/default/2025/13/originals/test.jpg",  # 月份超出范围
            "aivoya/portal/default/2025/00/originals/test.jpg",  # 月份为0
            "aivoya/portal/default/abcd/01/originals/test.jpg",  # 年份非数字
        ]
        
        for path in valid_paths:
            with self.subTest(path=path):
                self.assertTrue(validate_media_path(path), f"Path should be valid: {path}")
        
        for path in invalid_paths:
            with self.subTest(path=path):
                self.assertFalse(validate_media_path(path), f"Path should be invalid: {path}")
    
    def test_file_extension_handling(self):
        """测试文件扩展名处理"""
        test_cases = [
            ("image.jpg", ".jpg"),
            ("document.PDF", ".pdf"),  # 大写转小写
            ("file_without_extension", ".bin"),  # 无扩展名时的默认值
            ("file.with.multiple.dots.png", ".png"),  # 多个点的情况
        ]
        
        for filename, expected_ext in test_cases:
            with self.subTest(filename=filename):
                path = build_media_path(self.mock_instance, filename)
                self.assertTrue(path.endswith(expected_ext))
    
    def test_collection_slug_conversion(self):
        """测试集合名称转换为slug"""
        mock_collection = Mock()
        mock_collection.name = "Beijing Local News Media"
        self.mock_instance.collection = mock_collection
        
        path = build_media_path(self.mock_instance, self.test_filename)
        
        parts = path.split('/')
        self.assertEqual(parts[2], "beijing-local-news-media")  # 空格转换为连字符
