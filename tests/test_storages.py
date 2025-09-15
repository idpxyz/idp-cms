"""
存储后端测试
"""
import os
import tempfile
from django.test import TestCase, override_settings
from django.core.files.base import ContentFile
from apps.core.storages import PublicMediaStorage, PrivateMediaStorage


class StorageBackendsTestCase(TestCase):
    """测试自定义存储后端"""
    
    def setUp(self):
        """设置测试环境"""
        self.test_content = b"Test file content for storage backend testing"
        self.test_filename = "test_file.txt"
    
    def test_public_storage_initialization(self):
        """测试公共存储后端初始化"""
        storage = PublicMediaStorage()
        
        # 验证基本配置
        self.assertEqual(storage.bucket_name, "idp-media-prod-public")
        self.assertIsNone(storage.default_acl)
        self.assertFalse(storage.querystring_auth)
        self.assertFalse(storage.file_overwrite)
        
        # 验证MinIO配置
        self.assertEqual(storage.access_key, os.getenv("MINIO_ACCESS_KEY"))
        self.assertEqual(storage.secret_key, os.getenv("MINIO_SECRET_KEY"))
        self.assertEqual(storage.endpoint_url, os.getenv("MINIO_ENDPOINT"))
        self.assertEqual(storage.region_name, "us-east-1")
    
    def test_private_storage_initialization(self):
        """测试私有存储后端初始化"""
        storage = PrivateMediaStorage()
        
        # 验证基本配置
        self.assertEqual(storage.bucket_name, "idp-media-prod-private")
        self.assertEqual(storage.default_acl, "private")
        self.assertTrue(storage.querystring_auth)
        self.assertFalse(storage.file_overwrite)
        
        # 验证MinIO配置
        self.assertEqual(storage.access_key, os.getenv("MINIO_ACCESS_KEY"))
        self.assertEqual(storage.secret_key, os.getenv("MINIO_SECRET_KEY"))
        self.assertEqual(storage.endpoint_url, os.getenv("MINIO_ENDPOINT"))
        self.assertEqual(storage.region_name, "us-east-1")
    
    def test_public_storage_url_generation(self):
        """测试公共存储URL生成"""
        storage = PublicMediaStorage()
        
        # 模拟文件路径
        test_path = "aivoya/portal/images/2025/01/originals/test.jpg"
        
        # 验证URL生成逻辑
        expected_domain = f"{os.getenv('MINIO_PUBLIC_DOMAIN', 'localhost:9002')}/idp-media-prod-public"
        self.assertEqual(storage.custom_domain, expected_domain)
    
    def test_private_storage_security_settings(self):
        """测试私有存储安全设置"""
        storage = PrivateMediaStorage()
        
        # 验证私有文件安全配置
        self.assertEqual(storage.default_acl, "private")
        self.assertTrue(storage.querystring_auth)
        
        # 验证S3兼容性设置
        self.assertEqual(storage.addressing_style, "path")
        self.assertEqual(storage.signature_version, "s3v4")
        self.assertFalse(storage.verify)
        self.assertFalse(storage.use_ssl)
    
    @override_settings(
        MINIO_ACCESS_KEY="test_access_key",
        MINIO_SECRET_KEY="test_secret_key",
        MINIO_ENDPOINT="http://test-minio:9000",
        MINIO_PUBLIC_DOMAIN="test.example.com"
    )
    def test_storage_with_custom_settings(self):
        """测试自定义设置下的存储配置"""
        public_storage = PublicMediaStorage()
        private_storage = PrivateMediaStorage()
        
        # 验证自定义设置被正确应用
        self.assertEqual(public_storage.access_key, "test_access_key")
        self.assertEqual(public_storage.secret_key, "test_secret_key")
        self.assertEqual(public_storage.endpoint_url, "http://test-minio:9000")
        self.assertEqual(public_storage.custom_domain, "test.example.com/idp-media-prod-public")
        
        self.assertEqual(private_storage.access_key, "test_access_key")
        self.assertEqual(private_storage.secret_key, "test_secret_key")
        self.assertEqual(private_storage.endpoint_url, "http://test-minio:9000")
