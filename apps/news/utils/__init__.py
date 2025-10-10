"""
News app utilities
"""

from .slug_generator import (
    SlugGenerator,
    generate_slug,
    generate_short_slug,
    is_chinese_slug,
)

__all__ = [
    'SlugGenerator',
    'generate_slug',
    'generate_short_slug',
    'is_chinese_slug',
]

