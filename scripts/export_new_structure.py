#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Export new system structure (channels and categories)
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/opt/idp-cms')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Channel, Category
import json

print('=== Channels ===')
channels = []
for ch in Channel.objects.all().order_by('order', 'id'):
    channels.append({
        'id': ch.id,
        'name': ch.name,
        'slug': ch.slug,
        'order': ch.order
    })
    print('{:3d} | {:20s} | {}'.format(ch.id, ch.name, ch.slug))

print('\n=== Categories ===')
categories = []
for cat in Category.objects.all().order_by('order', 'id'):
    categories.append({
        'id': cat.id,
        'name': cat.name,
        'slug': cat.slug,
        'parent_id': cat.parent_id if cat.parent else None,
        'order': cat.order
    })
    parent = '(parent:{})'.format(cat.parent.name) if cat.parent else ''
    print('{:3d} | {:20s} | {:20s} {}'.format(cat.id, cat.name, cat.slug, parent))

# Save as JSON
output = {
    'channels': channels,
    'categories': categories
}

with open('/tmp/new_structure.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print('\nTotal: {} channels, {} categories'.format(
    Channel.objects.count(),
    Category.objects.count()
))
print('Saved to: /tmp/new_structure.json')

