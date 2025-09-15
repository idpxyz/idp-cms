"""
Presigned URL 功能测试
"""
import json
from unittest.mock import patch, Mock
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


class PresignedURLTestCase(TestCase):
    """测试预签名URL功能"""
    
    def setUp(self):
        """设置测试环境"""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass'
        )
        self.client.login(username='testuser', password='testpass')
    
    def test_presign_download_requires_login(self):
        """测试下载预签名URL需要登录"""
        self.client.logout()
        response = self.client.get('/api/media/presign-download/test/file.pdf/')
        self.assertEqual(response.status_code, 302)  # 重定向到登录页
    
    @patch('apps.media.views._get_s3_client')
    def test_presign_download_success(self, mock_get_s3_client):
        """测试成功生成下载预签名URL"""
        # 模拟S3客户端
        mock_s3 = Mock()
        mock_s3.generate_presigned_url.return_value = 'https://test-url.com/file.pdf?signature=abc123'
        mock_get_s3_client.return_value = mock_s3
        
        response = self.client.get('/api/media/presign-download/aivoya/portal/docs/2025/01/originals/test.pdf/')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        
        self.assertIn('url', data)
        self.assertIn('expires_in', data)
        self.assertIn('key', data)
        self.assertEqual(data['expires_in'], 600)
    
    def test_presign_download_unsafe_key(self):
        """测试不安全的文件键值被拒绝"""
        unsafe_keys = [
            '../../../etc/passwd',
            '/absolute/path',
            'file\\with\\backslash',
            'unsafe/path'  # 不以允许的前缀开始
        ]
        
        for key in unsafe_keys:
            with self.subTest(key=key):
                response = self.client.get(f'/api/media/presign-download/{key}/')
                self.assertEqual(response.status_code, 400)
                data = json.loads(response.content)
                self.assertEqual(data['error'], 'Invalid file key')
    
    @patch('apps.media.views._get_s3_client')
    def test_presign_upload_success(self, mock_get_s3_client):
        """测试成功生成上传预签名URL"""
        # 模拟S3客户端
        mock_s3 = Mock()
        mock_s3.generate_presigned_post.return_value = {
            'url': 'https://test-upload-url.com',
            'fields': {'key': 'test/file.pdf', 'Content-Type': 'application/pdf'}
        }
        mock_get_s3_client.return_value = mock_s3
        
        data = {
            'filename': 'test-document.pdf',
            'content_type': 'application/pdf',
            'site': 'portal'
        }
        
        response = self.client.post(
            '/api/media/presign-upload/',
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        
        self.assertIn('upload_url', response_data)
        self.assertIn('fields', response_data)
        self.assertIn('key', response_data)
        self.assertIn('expires_in', response_data)
        self.assertEqual(response_data['expires_in'], 3600)
    
    def test_presign_upload_missing_filename(self):
        """测试上传预签名URL缺少文件名"""
        data = {
            'content_type': 'application/pdf'
        }
        
        response = self.client.post(
            '/api/media/presign-upload/',
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['error'], 'Missing filename')
    
    def test_presign_upload_invalid_json(self):
        """测试上传预签名URL无效JSON"""
        response = self.client.post(
            '/api/media/presign-upload/',
            data='invalid json',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['error'], 'Invalid JSON')
    
    @patch('apps.media.views._get_s3_client')
    def test_file_info_success(self, mock_get_s3_client):
        """测试成功获取文件信息"""
        from datetime import datetime
        
        # 模拟S3客户端
        mock_s3 = Mock()
        mock_s3.head_object.return_value = {
            'ContentLength': 1024,
            'ContentType': 'application/pdf',
            'LastModified': datetime(2025, 1, 1, 12, 0, 0),
            'ETag': '"abc123def456"'
        }
        mock_get_s3_client.return_value = mock_s3
        
        response = self.client.get('/api/media/file-info/aivoya/portal/docs/2025/01/originals/test.pdf/')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        
        self.assertEqual(data['size'], 1024)
        self.assertEqual(data['content_type'], 'application/pdf')
        self.assertEqual(data['etag'], 'abc123def456')
        self.assertIn('last_modified', data)
    
    def test_file_info_unsafe_key(self):
        """测试文件信息API拒绝不安全的键值"""
        response = self.client.get('/api/media/file-info/../../../etc/passwd/')
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Invalid file key')
