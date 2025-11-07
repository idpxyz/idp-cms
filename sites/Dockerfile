# 多阶段构建 Dockerfile - 优化中国网络
FROM node:20-alpine AS base

# 使用中国镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 设置npm中国镜像
RUN npm config set registry https://registry.npmmirror.com/

# 安装依赖
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

# 开发阶段
FROM base AS development

# 在安装依赖前设置 Puppeteer 跳过下载，避免安装阶段拉取 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser

# 安装 Chromium 用于 Lighthouse / Puppeteer（运行时使用系统Chromium）
RUN apk add --no-cache chromium

# 安装开发依赖（此时已跳过 Puppeteer 的浏览器下载）
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动开发服务器
CMD ["npm", "run", "dev"]

# 生产阶段
FROM base AS production

# 设置 Puppeteer 跳过下载
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# 先安装所有依赖（包括 devDependencies）用于构建
RUN npm install

# 复制源代码
COPY . .

# 设置构建时的环境变量（可以通过 --build-arg 覆盖）
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_PORTAL_SITE=localhost
ARG NEXT_PUBLIC_CMS_URL=http://localhost:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_PORTAL_SITE=$NEXT_PUBLIC_PORTAL_SITE
ENV NEXT_PUBLIC_CMS_URL=$NEXT_PUBLIC_CMS_URL

# 构建应用
RUN npm run build

# 🚀 Standalone模式：复制静态文件到standalone目录
# Next.js standalone模式需要手动复制public和.next/static
RUN cp -r public .next/standalone/ && \
    cp -r .next/static .next/standalone/.next/

# 清理开发依赖，减小最终镜像大小
RUN npm prune --production

# 暴露端口
EXPOSE 3000

# 🚀 切换到standalone目录并启动
# Next.js standalone模式需要在standalone目录中运行
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]
