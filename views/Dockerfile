FROM node:18-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# 先复制 package.json 与锁文件，以便充分利用 Docker 缓存加速依赖安装
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 再复制项目所有前端源码
COPY . .

# 跳过 browserslist 更新提示，并增加 NodeJS 编译可用内存上限（防止服务器构建被系统杀进程OOM）
ENV BROWSERSLIST_IGNORE_OLD_DATA=true
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm run build-only

# ============ 阶段2: Nginx 托管 ============
FROM nginx:alpine

# 只从 builder 阶段复制已经编译加工好的 dist 静态文件
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
