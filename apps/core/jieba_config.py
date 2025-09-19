"""
jieba配置模块

解决jieba缓存权限问题，统一配置jieba的缓存目录
"""

import os
import logging

logger = logging.getLogger(__name__)

def configure_jieba():
    """
    配置jieba使用自定义缓存目录
    
    只设置缓存路径，不立即初始化jieba
    """
    try:
        # 获取自定义缓存目录，如果没有设置则使用应用目录下的tmp
        cache_dir = os.environ.get('JIEBA_CACHE_DIR', '/app/tmp')
        
        # 确保缓存目录存在
        os.makedirs(cache_dir, exist_ok=True)
        
        # 设置jieba缓存文件路径
        cache_file = os.path.join(cache_dir, 'jieba.cache')
        
        # 导入jieba并设置缓存路径（但不初始化）
        import jieba
        jieba.dt.cache_file = cache_file
        
        logger.info(f"jieba缓存目录已配置为: {cache_file}")
        
        return True
        
    except Exception as e:
        logger.error(f"配置jieba缓存目录失败: {e}")
        return False

def get_jieba_instance():
    """
    获取已配置的jieba实例
    
    Returns:
        jieba module: 已配置的jieba模块
    """
    import jieba
    
    # 确保jieba已经配置缓存路径
    if not hasattr(jieba.dt, 'cache_file'):
        configure_jieba()
    
    return jieba

