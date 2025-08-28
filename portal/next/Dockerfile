FROM node:20-slim

# 配置中国镜像源以加速下载
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources || \
    sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list || \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main" > /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main" >> /etc/apt/sources.list

WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@latest --activate && pnpm config set registry https://registry.npmmirror.com/ && pnpm i;     elif [ -f yarn.lock ]; then yarn install;     else npm install --registry https://registry.npmmirror.com/; fi
COPY . .
RUN chmod +x node_modules/.bin/*
# Fix permissions for Next.js to work properly
RUN chown -R node:node /app && chmod -R 755 /app
USER node
EXPOSE 3000
CMD ["npm","run","dev","--","-p","3000"]
