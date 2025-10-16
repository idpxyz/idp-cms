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

# 构建应用
RUN npm run build

# 清理开发依赖，减小最终镜像大小
RUN npm prune --production

# 暴露端口
EXPOSE 3000

# 启动生产服务器
CMD ["npm", "start"]
