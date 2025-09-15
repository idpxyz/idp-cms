"""
阿里云CDN服务提供商实现

提供阿里云CDN的缓存清除、状态查询、性能监控等功能
"""

import json
import hashlib
import time
import requests
from typing import Dict, List, Any
from .base import BaseCDNProvider
from apps.api.utils.http import http_client


class AliyunCDNProvider(BaseCDNProvider):
    """阿里云CDN服务提供商"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.access_key_id = self.api_key
        self.access_key_secret = self.api_secret
        self.endpoint = "https://cdn.aliyuncs.com"
        self.version = "2018-05-10"
    
    def _generate_signature(self, params: Dict[str, Any]) -> str:
        """
        生成阿里云API签名
        
        Args:
            params: 请求参数
            
        Returns:
            str: 签名结果
        """
        # 按参数名排序
        sorted_params = sorted(params.items())
        
        # 构造规范化请求字符串
        canonicalized_query_string = "&".join([
            f"{k}={v}" for k, v in sorted_params
        ])
        
        # 构造待签名字符串
        string_to_sign = "GET&%2F&" + requests.utils.quote(
            canonicalized_query_string, safe=''
        )
        
        # 计算签名
        signature = hashlib.sha1(
            string_to_sign.encode('utf-8')
        ).hexdigest()
        
        return signature
    
    def _make_request(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        发送阿里云API请求
        
        Args:
            action: API动作
            params: 请求参数
            
        Returns:
            Dict: API响应结果
        """
        # 构建基础参数
        request_params = {
            'Action': action,
            'Format': 'JSON',
            'Version': self.version,
            'AccessKeyId': self.access_key_id,
            'Timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'SignatureMethod': 'HMAC-SHA1',
            'SignatureVersion': '1.0',
            'SignatureNonce': str(int(time.time() * 1000)),
            **params
        }
        
        # 生成签名
        request_params['Signature'] = self._generate_signature(request_params)
        
        try:
            # 发送请求（使用共享HTTP客户端，包含超时与熔断）
            response = http_client.get(self.endpoint, params=request_params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Aliyun CDN API request failed: {e}")
    
    def purge_cache(self, urls: List[str]) -> bool:
        """
        清除阿里云CDN缓存
        
        Args:
            urls: 需要清除缓存的URL列表
            
        Returns:
            bool: 是否成功清除缓存
        """
        try:
            params = {
                'ObjectPath': ','.join(urls),
                'ObjectType': 'File',
            }
            
            result = self._make_request('RefreshObjectCaches', params)
            
            # 检查响应结果
            if result.get('Code') == '200':
                return True
            else:
                print(f"Aliyun CDN purge failed: {result.get('Message', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"Aliyun CDN purge error: {e}")
            return False
    
    def get_cache_status(self, url: str) -> Dict[str, Any]:
        """
        获取缓存状态
        
        Args:
            url: 要检查的URL
            
        Returns:
            Dict: 缓存状态信息
        """
        try:
            # 阿里云CDN没有直接的缓存状态查询API
            # 这里返回基本信息
            return {
                'provider': 'aliyun',
                'url': url,
                'domain': self.domain,
                'status': 'unknown',
                'message': 'Aliyun CDN does not provide direct cache status query API'
            }
        except Exception as e:
            return {
                'provider': 'aliyun',
                'url': url,
                'domain': self.domain,
                'status': 'error',
                'error': str(e)
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        获取性能指标
        
        Returns:
            Dict: 性能指标数据
        """
        try:
            # 获取QPS数据
            qps_params = {
                'DomainName': self.domain,
                'StartTime': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 3600)),
                'EndTime': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }
            
            qps_result = self._make_request('DescribeDomainQpsData', qps_params)
            
            # 获取带宽数据
            bandwidth_params = {
                'DomainName': self.domain,
                'StartTime': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 3600)),
                'EndTime': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }
            
            bandwidth_result = self._make_request('DescribeDomainBpsData', bandwidth_params)
            
            return {
                'provider': 'aliyun',
                'domain': self.domain,
                'timestamp': time.time(),
                'qps_data': qps_result.get('QpsDataInterval', {}),
                'bandwidth_data': bandwidth_result.get('BpsDataInterval', {}),
                'success': True
            }
            
        except Exception as e:
            return {
                'provider': 'aliyun',
                'domain': self.domain,
                'timestamp': time.time(),
                'error': str(e),
                'success': False
            }
    
    def get_domain_info(self) -> Dict[str, Any]:
        """
        获取域名信息
        
        Returns:
            Dict: 域名信息
        """
        try:
            params = {
                'DomainName': self.domain,
            }
            
            result = self._make_request('DescribeCdnDomainDetail', params)
            
            if result.get('Code') == '200':
                domain_info = result.get('DomainDetail', {})
                return {
                    'provider': 'aliyun',
                    'domain': self.domain,
                    'status': domain_info.get('DomainStatus', 'unknown'),
                    'cname': domain_info.get('Cname', ''),
                    'ssl_protocol': domain_info.get('SslProtocol', ''),
                    'ssl_cert': domain_info.get('SslCert', ''),
                    'source_type': domain_info.get('SourceType', ''),
                    'sources': domain_info.get('Sources', {}),
                    'success': True
                }
            else:
                return {
                    'provider': 'aliyun',
                    'domain': self.domain,
                    'error': result.get('Message', 'Unknown error'),
                    'success': False
                }
                
        except Exception as e:
            return {
                'provider': 'aliyun',
                'domain': self.domain,
                'error': str(e),
                'success': False
            }
