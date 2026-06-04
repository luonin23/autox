#!/data/data/com.termux/files/usr/bin/bash
# Fold7 Agent — Termux 定时任务配置
# 用法: bash setup-cron.sh

set -e

echo "=== Fold7 Agent Cron Setup ==="

# 1. 确保 crond 可用
if ! command -v crond &> /dev/null; then
    echo "[1/4] 安装 cronie..."
    pkg install -y cronie
fi

# 2. 启动 crond
echo "[2/4] 启动 crond..."
mkdir -p "$PREFIX/var/run"
crond || true

# 3. 创建定时任务目录
CRON_DIR="$HOME/.cron"
mkdir -p "$CRON_DIR"

# 4. 写入示例定时任务（每天 9:00 打卡）
CRON_FILE="$CRON_DIR/fold7-agent"
cat > "$CRON_FILE" << 'EOF'
# 每天 9:00 执行钉钉打卡
0 9 * * * /data/data/com.termux/files/usr/bin/node /data/data/com.termux/files/home/fold7-agent/autojs-scripts/main.js --task=clockin --app=钉钉 --button=上班打卡 >> /data/data/com.termux/files/home/fold7-agent/logs/cron.log 2>&1
EOF

# 5. 加载 crontab
crontab "$CRON_FILE"

echo "[3/4] 当前定时任务:"
crontab -l

# 6. 创建日志目录
mkdir -p "$HOME/fold7-agent/logs"

echo ""
echo "=== Setup Complete ==="
echo "已创建每天 9:00 钉钉打卡任务"
echo ""
echo "常用命令:"
echo "  crontab -l          # 查看任务"
echo "  crontab -e          # 编辑任务"
echo "  pkill crond; crond  # 重启 crond"
