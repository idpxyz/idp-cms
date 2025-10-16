# Multi-stage Dockerfile for Django
# 支持开发、测试和生产环境

# Base image
FROM python:3.11-slim AS base

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_DEFAULT_TIMEOUT=20
ENV PIP_RETRIES=3
ENV PIP_NO_CACHE_DIR=1

# 安装系统依赖（切换至就近镜像并强制 IPv4，加速构建）
RUN set -eux; \
    . /etc/os-release; codename=$VERSION_CODENAME; \
    echo "deb https://mirrors.aliyun.com/debian $codename main contrib non-free non-free-firmware" > /etc/apt/sources.list; \
    echo "deb https://mirrors.aliyun.com/debian $codename-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list; \
    echo "deb https://mirrors.aliyun.com/debian-security $codename-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list; \
    # Debian 12+ 使用 deb822 格式的 sources，优先级高于 sources.list，这里移除以避免回落到 deb.debian.org
    rm -f /etc/apt/sources.list.d/debian.sources; \
    # 配置 pip 使用国内镜像（阿里云）并增加清华作为后备
    printf "[global]\nindex-url = https://mirrors.aliyun.com/pypi/simple/\nextra-index-url = https://pypi.tuna.tsinghua.edu.cn/simple\ntrusted-host = mirrors.aliyun.com pypi.tuna.tsinghua.edu.cn\nretries = 5\ntimeout = 30\n" > /etc/pip.conf; \
    apt-get -o Acquire::ForceIPv4=true -o Acquire::Retries=3 update; \
    apt-get install -y --no-install-recommends \
      gcc \
      g++ \
      libpq-dev \
      libjpeg-dev \
      libfreetype6-dev \
      zlib1g-dev \
      libwebp-dev \
      build-essential \
      curl \
      ca-certificates; \
    python -m pip install --upgrade pip setuptools wheel; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Development stage
FROM base AS development

# 复制 requirements（使用单一 requirements.txt）
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY . .

# 创建媒体和静态文件目录
RUN mkdir -p media static

# 创建日志目录并设置权限（生产环境）
RUN mkdir -p /var/log/django && chown -R django:django /var/log/django

# 创建日志目录并设置权限
RUN mkdir -p /var/log/django && chown -R django:django /var/log/django

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Test stage
FROM base AS test

# 复制 requirements（使用单一 requirements.txt）
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY . .

# 创建媒体和静态文件目录
RUN mkdir -p media static

# 运行测试所需的设置
ENV DJANGO_SETTINGS_MODULE=config.settings.test

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base AS production

# 创建非 root 用户
RUN groupadd -r django && useradd --no-log-init -r -g django django

# 复制 requirements（使用单一 requirements.txt）
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY . .

# 创建媒体和静态文件目录
RUN mkdir -p media static

# 创建日志目录并设置权限（生产阶段）
RUN mkdir -p /var/log/django && chown -R django:django /var/log/django

# 设置权限
RUN chown -R django:django /app
USER django

# 收集静态文件（仅在此步骤使用生产设置并提供必需变量）
RUN DJANGO_SETTINGS_MODULE=config.settings.prod DJANGO_ALLOWED_HOSTS=localhost python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]