# 使用官方Python运行时作为基础镜像
FROM python:3.11-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 设置工作目录
WORKDIR /app

# 配置中国镜像源以加速下载
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources || \
    sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list || \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main" > /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main" >> /etc/apt/sources.list

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 配置pip中国镜像源以加速下载
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/ && \
    pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY . .

# 确保模板和应用目录被正确复制
COPY templates/ /app/templates/
COPY apps/ /app/apps/

# 创建必要的目录并设置权限
RUN mkdir -p logs staticfiles media/original_images media/documents media/images && \
    chmod -R 755 logs staticfiles media

# 收集静态文件（在开发环境中跳过）
# RUN python manage.py collectstatic --noinput

# 暴露端口
EXPOSE 8000

# 运行命令（开发环境使用 runserver）
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]