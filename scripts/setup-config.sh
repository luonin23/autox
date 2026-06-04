#!/bin/bash
# Fold7 Agent — 交互式配置向导
# 用法: bash setup-config.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_DIR/autojs-scripts"
CONFIG_FILE="$CONFIG_DIR/config.js"
TEMPLATE_FILE="$CONFIG_DIR/config.template.js"

echo "=== Fold7 Agent 配置向导 ==="
echo ""

# 1. 检查模板
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ 错误: 未找到配置模板 $TEMPLATE_FILE"
    exit 1
fi

# 2. 如果已有配置，询问是否覆盖
if [ -f "$CONFIG_FILE" ]; then
    echo "⚠️  已存在配置文件: $CONFIG_FILE"
    read -p "是否覆盖? [y/N] " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
fi

# 3. 选择模型提供商
echo ""
echo "选择模型提供商:"
echo "  1) Kimi (Moonshot AI) — 推荐，无需本地算力"
echo "  2) 本地 llama.cpp — 需要提前编译并下载模型"
read -p "请输入选项 [1-2]: " PROVIDER_CHOICE

if [ "$PROVIDER_CHOICE" = "2" ]; then
    PROVIDER="local"
else
    PROVIDER="kimi"
fi

# 4. 配置参数
if [ "$PROVIDER" = "kimi" ]; then
    echo ""
    echo "📝 Kimi 配置"
    echo "   获取 API Key: https://platform.moonshot.cn"
    read -p "   请输入 Moonshot API Key: " KIMI_API_KEY
    read -p "   模型名称 [默认: kimi-k2-6]: " KIMI_MODEL
    KIMI_MODEL="${KIMI_MODEL:-kimi-k2-6}"
else
    echo ""
    echo "📝 本地模型配置"
    read -p "   llama-server 地址 [默认: http://127.0.0.1:8080/v1/chat/completions]: " LOCAL_URL
    LOCAL_URL="${LOCAL_URL:-http://127.0.0.1:8080/v1/chat/completions}"
    read -p "   模型名称 [默认: local]: " LOCAL_MODEL
    LOCAL_MODEL="${LOCAL_MODEL:-local}"
fi

# 5. 高级选项
echo ""
read -p "最大执行步数 [默认: 15]: " MAX_STEPS
MAX_STEPS="${MAX_STEPS:-15}"

# 6. 生成配置文件
cat > "$CONFIG_FILE" << EOF
module.exports = {
    provider: "${PROVIDER}",

    kimi: {
        apiKey: "${KIMI_API_KEY:-}",
        model: "${KIMI_MODEL:-kimi-k2-6}",
        url: "https://api.moonshot.cn/v1/chat/completions",
    },

    local: {
        apiKey: "",
        model: "${LOCAL_MODEL:-local}",
        url: "${LOCAL_URL:-http://127.0.0.1:8080/v1/chat/completions}",
    },

    maxSteps: ${MAX_STEPS},

    delay: {
        min: 500,
        max: 2000,
        wechatMin: 3000,
    },
};
EOF

echo ""
echo "✅ 配置已保存到: $CONFIG_FILE"
echo ""

# 7. 验证
if [ "$PROVIDER" = "kimi" ] && [ -z "$KIMI_API_KEY" ]; then
    echo "⚠️  警告: Kimi API Key 为空，运行时会报错"
    echo "   请稍后编辑 $CONFIG_FILE 填入 API Key"
fi

# 8. 下一步提示
echo ""
echo "=== 配置完成 ==="
echo ""
echo "下一步:"
if [ "$PROVIDER" = "local" ]; then
    echo "  1. 确保 llama.cpp server 已启动"
    echo "     ~/llama.cpp/build/bin/llama-server -m ~/models/your-model.gguf --host 127.0.0.1 --port 8080"
fi
echo "  2. 在 AutoX.js 中运行 main.js"
echo "  3. 或在 Termux 中测试:"
echo "     cd $CONFIG_DIR && node main.js --instruction='打开设置'"
echo ""
