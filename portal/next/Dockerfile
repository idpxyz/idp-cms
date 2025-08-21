FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@latest --activate && pnpm i;     elif [ -f yarn.lock ]; then yarn install;     else npm install; fi
COPY . .
RUN chmod +x node_modules/.bin/*
# Fix permissions for Next.js to work properly
RUN chown -R node:node /app && chmod -R 755 /app
USER node
EXPOSE 3000
CMD ["npm","run","dev","--","-p","3000"]
