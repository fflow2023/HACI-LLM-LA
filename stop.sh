#!/bin/bash

# 彩色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_DIR="$SCRIPT_DIR/logs/latest"

if [ ! -f "$LOG_DIR/pids.txt" ]; then
    echo -e "${YELLOW}⚠️ 没有找到运行中的服务${NC}"
    exit 1
fi

echo -e "${YELLOW}🛑 正在停止所有服务...${NC}"

# 停止记录在pid文件中的服务
while IFS=: read -r pid name; do
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo -e "${RED}■ 已停止 $name (PID: $pid)${NC}"
    else
        echo -e "${YELLOW}⚠️ $name (PID: $pid) 已停止${NC}"
    fi
done < "$LOG_DIR/pids.txt"

stop_unrecorded_service() {
    local pattern=$1
    local name=$2
    
    # 查找父进程
    pids=$(pgrep -f "$pattern")
    if [ -n "$pids" ]; then
        for pid in $pids; do
            # 停止父进程及其所有子进程
            pkill -P "$pid"
            kill "$pid"
            echo -e "${RED}■ 已停止未记录的 $name (PID: $pid 及其子进程)${NC}"
        done
    fi
    
    # 额外检查端口占用情况（针对前端服务）
    if [ "$name" = "service服务" ]; then
        port_pid=$(lsof -t -i :3000 || echo "")
        if [ -n "$port_pid" ]; then
            kill "$port_pid"
            echo -e "${RED}■ 已停止占用3000端口的 $name (PID: $port_pid)${NC}"
        fi
    fi
}

stop_unrecorded_service "pnpm start:dev" "service服务"
stop_unrecorded_service "python3 api.py" "Python后端"
stop_unrecorded_service "pnpm run dev" "views服务"

rm "$LOG_DIR/pids.txt"
echo -e "${GREEN}✅ 所有服务已停止${NC}"
echo -e "📁 本次运行日志保存在: $LOG_DIR"