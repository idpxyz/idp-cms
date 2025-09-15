"""
爬虫API配置

在您的主settings.py文件中添加以下配置
"""

# 爬虫API密钥配置
# 建议使用环境变量存储密钥，避免硬编码
import os

CRAWLER_API_KEYS = {
    # 客户端名称: API密钥
    'news_crawler_bot': os.getenv('CRAWLER_API_KEY_NEWS', 'your-secret-key-here'),
    'content_scraper': os.getenv('CRAWLER_API_KEY_CONTENT', 'another-secret-key'),
    'data_importer': os.getenv('CRAWLER_API_KEY_IMPORTER', 'third-secret-key'),
}

# 爬虫API安全配置
CRAWLER_API_SETTINGS = {
    # 单次批量导入最大文章数量
    'MAX_ARTICLES_PER_BATCH': 100,
    
    # 是否允许更新已存在的文章
    'ALLOW_ARTICLE_UPDATES': True,
    
    # 是否记录详细的操作日志
    'DETAILED_LOGGING': True,
    
    # 是否启用IP白名单（可选）
    'IP_WHITELIST_ENABLED': False,
    'ALLOWED_IPS': [
        '127.0.0.1',
        '10.0.0.0/8',
        '192.168.0.0/16',
    ],
}

# 日志配置
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'crawler_api_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.getenv('CRAWLER_API_LOG_FILE', '/tmp/crawler_api.log'),
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps.api.rest.crawler_api': {
            'handlers': ['crawler_api_file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
}
