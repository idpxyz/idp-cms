#!/usr/bin/env python3
"""
生成默认封面图片的脚本
为不同的新闻分类生成对应的 SVG 默认封面图片
"""

import os
from pathlib import Path

# 默认封面图片配置
DEFAULT_COVERS = {
    'default': {
        'icon': '📰',
        'bg_color': '#3b82f6',
        'text': '新闻'
    },
    'politics': {
        'icon': '🏛️',
        'bg_color': '#dc2626',
        'text': '政治'
    },
    'economy': {
        'icon': '💼',
        'bg_color': '#059669',
        'text': '经济'
    },
    'tech': {
        'icon': '💻',
        'bg_color': '#7c3aed',
        'text': '科技'
    },
    'culture': {
        'icon': '🎨',
        'bg_color': '#db2777',
        'text': '文化'
    },
    'sports': {
        'icon': '⚽',
        'bg_color': '#f59e0b',
        'text': '体育'
    },
    'health': {
        'icon': '🏥',
        'bg_color': '#10b981',
        'text': '健康'
    },
    'education': {
        'icon': '📚',
        'bg_color': '#6366f1',
        'text': '教育'
    },
    'environment': {
        'icon': '🌱',
        'bg_color': '#14b8a6',
        'text': '环境'
    },
    'international': {
        'icon': '🌍',
        'bg_color': '#0ea5e9',
        'text': '国际'
    },
    'society': {
        'icon': '👥',
        'bg_color': '#8b5cf6',
        'text': '社会'
    },
    'military': {
        'icon': '🛡️',
        'bg_color': '#64748b',
        'text': '军事'
    },
    'travel': {
        'icon': '✈️',
        'bg_color': '#06b6d4',
        'text': '旅游'
    }
}

def generate_svg(config, width=800, height=450):
    """生成 SVG 图片内容"""
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 渐变背景 -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{config['bg_color']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{config['bg_color']};stop-opacity:0.7" />
    </linearGradient>
  </defs>
  
  <!-- 背景 -->
  <rect width="100%" height="100%" fill="url(#grad)"/>
  
  <!-- 装饰性网格线 -->
  <path d="M 0 0 L {width} {height}" stroke="white" stroke-width="0.5" opacity="0.1"/>
  <path d="M {width} 0 L 0 {height}" stroke="white" stroke-width="0.5" opacity="0.1"/>
  
  <!-- 图标 -->
  <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.9">
    {config['icon']}
  </text>
  
  <!-- 文字 -->
  <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
    {config['text']}
  </text>
</svg>'''
    return svg


def main():
    """生成所有默认封面图片"""
    # 获取脚本所在目录
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / 'sites' / 'public' / 'images' / 'default-covers'
    
    # 确保输出目录存在
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"正在生成默认封面图片到: {output_dir}")
    
    # 生成所有分类的封面图片
    for category, config in DEFAULT_COVERS.items():
        svg_content = generate_svg(config)
        output_file = output_dir / f"{category}.svg"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        print(f"✓ 已生成: {category}.svg")
    
    print(f"\n成功生成 {len(DEFAULT_COVERS)} 个默认封面图片!")


if __name__ == '__main__':
    main()


