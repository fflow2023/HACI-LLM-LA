#!/bin/sh
set -e

echo "⏳ 等待 MySQL 就绪..."

# 简单的 TCP 检测循环
MAX_RETRIES=30
RETRY_COUNT=0
while ! nc -z "${DB_HOST:-mysql}" "${DB_PORT:-3306}" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ MySQL 连接超时，已尝试 $MAX_RETRIES 次"
    exit 1
  fi
  echo "  MySQL 未就绪，等待中... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ MySQL 已就绪，启动 NestJS 服务..."
exec node dist/main.js
