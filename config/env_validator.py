"""
Django环境变量验证器
提供环境变量的验证、类型转换和默认值管理
"""

import os
import sys
import warnings
from typing import List, Dict, Any, Optional, Union
from urllib.parse import urlparse


class EnvironmentError(Exception):
    """环境变量配置错误"""
    pass


class EnvValidator:
    """环境变量验证器"""
    
    # 必需的环境变量
    REQUIRED_VARS = [
        'DJANGO_SECRET_KEY',
        'POSTGRES_DB',
        'POSTGRES_USER', 
        'POSTGRES_PASSWORD',
        'REDIS_URL',
    ]
    
    # 生产环境必需的环境变量
    PRODUCTION_REQUIRED_VARS = [
        'DJANGO_ALLOWED_HOSTS',
        'CMS_ORIGIN',
        'CMS_PUBLIC_URL',
    ]
    
    # URL类型的环境变量
    URL_VARS = [
        'CMS_ORIGIN',
        'CMS_PUBLIC_URL', 
        'FRONTEND_ORIGIN',
        'MEDIA_BASE_URL',
        'MEDIA_INTERNAL_URL',
        'REDIS_URL',
        'OPENSEARCH_URL',
        'CLICKHOUSE_URL',
    ]
    
    # 布尔类型的环境变量
    BOOLEAN_VARS = [
        'DJANGO_DEBUG',
        'ENABLE_MEDIA_CLEANUP',
        'ENABLE_RENDITION_CLEANUP',
        'ENABLE_MONITORING',
        'OPENSEARCH_SECURITY_DISABLED',
    ]
    
    # 整数类型的环境变量
    INTEGER_VARS = [
        'POSTGRES_PORT',
        'CMS_TIMEOUT',
        'FRONTEND_TIMEOUT',
        'CACHE_TIMEOUT',
        'API_CACHE_TIMEOUT',
    ]

    @classmethod
    def validate_all(cls) -> Dict[str, Any]:
        """验证所有环境变量配置"""
        results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'missing_required': [],
            'invalid_types': [],
            'invalid_urls': [],
            'summary': {}
        }
        
        # 检查必需变量
        missing = cls._check_required_vars()
        if missing:
            results['missing_required'] = missing
            results['errors'].extend([f"Missing required variable: {var}" for var in missing])
            results['valid'] = False
        
        # 检查生产环境必需变量
        if cls._is_production():
            prod_missing = cls._check_production_required_vars()
            if prod_missing:
                results['missing_required'].extend(prod_missing)
                results['errors'].extend([f"Missing production required variable: {var}" for var in prod_missing])
                results['valid'] = False
        
        # 验证URL格式
        invalid_urls = cls._validate_urls()
        if invalid_urls:
            results['invalid_urls'] = invalid_urls
            results['warnings'].extend([f"Invalid URL format: {var}={url}" for var, url in invalid_urls])
        
        # 验证类型
        type_errors = cls._validate_types()
        if type_errors:
            results['invalid_types'] = type_errors
            results['warnings'].extend([f"Invalid type: {var}={value}" for var, value in type_errors])
        
        # 安全检查
        security_warnings = cls._check_security()
        if security_warnings:
            results['warnings'].extend(security_warnings)
        
        # 生成摘要
        results['summary'] = {
            'environment': cls.get_str('NODE_ENV', 'development'),
            'total_vars_set': len([k for k, v in os.environ.items() if k.startswith(('DJANGO_', 'CMS_', 'FRONTEND_', 'POSTGRES_', 'REDIS_', 'MINIO_', 'OPENSEARCH_'))]),
            'required_vars_count': len(cls.REQUIRED_VARS),
            'missing_count': len(results['missing_required']),
            'warnings_count': len(results['warnings']),
            'errors_count': len(results['errors']),
        }
        
        return results

    @classmethod
    def _check_required_vars(cls) -> List[str]:
        """检查必需的环境变量"""
        missing = []
        for var in cls.REQUIRED_VARS:
            if not os.getenv(var):
                missing.append(var)
        return missing

    @classmethod
    def _check_production_required_vars(cls) -> List[str]:
        """检查生产环境必需的环境变量"""
        missing = []
        for var in cls.PRODUCTION_REQUIRED_VARS:
            if not os.getenv(var):
                missing.append(var)
        return missing

    @classmethod
    def _validate_urls(cls) -> List[tuple]:
        """验证URL格式"""
        invalid = []
        for var in cls.URL_VARS:
            value = os.getenv(var)
            if value and not cls._is_valid_url(value):
                invalid.append((var, value))
        return invalid

    @classmethod
    def _validate_types(cls) -> List[tuple]:
        """验证变量类型"""
        invalid = []
        
        # 验证布尔类型
        for var in cls.BOOLEAN_VARS:
            value = os.getenv(var)
            if value and not cls._is_valid_boolean(value):
                invalid.append((var, value))
        
        # 验证整数类型
        for var in cls.INTEGER_VARS:
            value = os.getenv(var)
            if value and not cls._is_valid_integer(value):
                invalid.append((var, value))
        
        return invalid

    @classmethod
    def _check_security(cls) -> List[str]:
        """安全配置检查"""
        warnings = []
        
        if cls._is_production():
            # 生产环境安全检查
            if cls.get_str('DJANGO_SECRET_KEY') == 'dev-secret-key-change-me-in-production':
                warnings.append("Using default secret key in production")
            
            if cls.get_bool('DJANGO_DEBUG', False):
                warnings.append("Debug mode enabled in production")
            
            allowed_hosts = cls.get_str('DJANGO_ALLOWED_HOSTS', '*')
            if allowed_hosts == '*':
                warnings.append("Allowing all hosts in production (DJANGO_ALLOWED_HOSTS=*)")
        
        return warnings

    @classmethod
    def _is_production(cls) -> bool:
        """检查是否为生产环境"""
        return cls.get_str('NODE_ENV', 'development') == 'production'

    @classmethod
    def _is_valid_url(cls, url: str) -> bool:
        """验证URL格式"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    @classmethod
    def _is_valid_boolean(cls, value: str) -> bool:
        """验证布尔值格式"""
        return value.lower() in ('true', 'false', '1', '0', 'yes', 'no', 'on', 'off')

    @classmethod
    def _is_valid_integer(cls, value: str) -> bool:
        """验证整数格式"""
        try:
            int(value)
            return True
        except (ValueError, TypeError):
            return False

    # 便捷获取方法
    @classmethod
    def get_str(cls, key: str, default: str = '') -> str:
        """获取字符串环境变量"""
        return os.getenv(key, default)

    @classmethod
    def get_bool(cls, key: str, default: bool = False) -> bool:
        """获取布尔环境变量"""
        value = os.getenv(key, '').lower()
        if value in ('true', '1', 'yes', 'on'):
            return True
        elif value in ('false', '0', 'no', 'off'):
            return False
        return default

    @classmethod
    def get_int(cls, key: str, default: int = 0) -> int:
        """获取整数环境变量"""
        try:
            return int(os.getenv(key, str(default)))
        except (ValueError, TypeError):
            return default

    @classmethod
    def get_list(cls, key: str, default: List[str] = None, separator: str = ',') -> List[str]:
        """获取列表环境变量"""
        if default is None:
            default = []
        value = os.getenv(key, '')
        if not value:
            return default
        return [item.strip() for item in value.split(separator) if item.strip()]

    @classmethod
    def print_validation_report(cls, detailed: bool = False) -> None:
        """打印验证报告"""
        results = cls.validate_all()
        
        print("=" * 60)
        print("🔍 Environment Variables Validation Report")
        print("=" * 60)
        
        # 摘要信息
        summary = results['summary']
        print(f"Environment: {summary['environment']}")
        print(f"Total variables: {summary['total_vars_set']}")
        print(f"Required variables: {summary['required_vars_count']}")
        print(f"Missing: {summary['missing_count']}")
        print(f"Warnings: {summary['warnings_count']}")
        print(f"Errors: {summary['errors_count']}")
        print()
        
        # 错误信息
        if results['errors']:
            print("❌ ERRORS:")
            for error in results['errors']:
                print(f"  - {error}")
            print()
        
        # 警告信息
        if results['warnings']:
            print("⚠️  WARNINGS:")
            for warning in results['warnings']:
                print(f"  - {warning}")
            print()
        
        # 详细信息
        if detailed and (results['missing_required'] or results['invalid_urls'] or results['invalid_types']):
            print("📋 DETAILS:")
            
            if results['missing_required']:
                print("  Missing required variables:")
                for var in results['missing_required']:
                    print(f"    - {var}")
            
            if results['invalid_urls']:
                print("  Invalid URLs:")
                for var, url in results['invalid_urls']:
                    print(f"    - {var}: {url}")
            
            if results['invalid_types']:
                print("  Invalid types:")
                for var, value in results['invalid_types']:
                    print(f"    - {var}: {value}")
            print()
        
        # 状态
        if results['valid']:
            print("✅ Environment validation PASSED")
        else:
            print("❌ Environment validation FAILED")
        
        print("=" * 60)


def validate_environment(strict: bool = False, detailed: bool = False) -> bool:
    """
    验证环境变量配置
    
    Args:
        strict: 严格模式，有任何警告都会抛出异常
        detailed: 显示详细报告
    
    Returns:
        bool: 验证是否通过
    
    Raises:
        EnvironmentError: 验证失败时抛出
    """
    results = EnvValidator.validate_all()
    
    if detailed:
        EnvValidator.print_validation_report(detailed=True)
    
    if not results['valid']:
        error_msg = f"Environment validation failed: {', '.join(results['errors'])}"
        raise EnvironmentError(error_msg)
    
    if strict and results['warnings']:
        warning_msg = f"Environment warnings in strict mode: {', '.join(results['warnings'])}"
        raise EnvironmentError(warning_msg)
    
    return True


# 在Django启动时自动验证
def auto_validate():
    """自动验证（在Django设置加载时调用）"""
    try:
        # 只在开发环境显示详细报告
        detailed = EnvValidator.get_str('NODE_ENV', 'development') == 'development'
        validate_environment(detailed=detailed)
    except EnvironmentError as e:
        print(f"❌ Environment validation failed: {e}")
        if EnvValidator._is_production():
            # 生产环境验证失败时退出
            sys.exit(1)
        else:
            # 开发环境只显示警告
            warnings.warn(str(e), UserWarning)
