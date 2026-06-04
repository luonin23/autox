#!/data/data/com.termux/files/usr/bin/bash
# 启动 llama.cpp HTTP server

MODEL_DIR="$HOME/models"
DEFAULT_MODEL="$MODEL_DIR/qwen2.5-7b-instruct-q4_k_m.gguf"
HOST="127.0.0.1"
PORT="8080"

# 如果传了参数就用参数，否则用默认
MODEL="${1:-$DEFAULT_MODEL}"

if [ ! -f "$MODEL" ]; then
    echo "Error: Model not found: $MODEL"
    echo "Available models:"
    ls -1 "$MODEL_DIR"/*.gguf 2>/dev/null || echo "  (none)"
    exit 1
fi

echo "Starting llama-server..."
echo "  Model: $MODEL"
echo "  URL:   http://$HOST:$PORT"
echo ""

# 使用 proot 绑定 tmp 目录（解决某些模型缓存问题）
proot -b /data/data/com.termux/files/usr/tmp:/tmp \
    "$HOME/llama.cpp/build/bin/llama-server" \
    -m "$MODEL" \
    --host "$HOST" \
    --port "$PORT" \
    -c 4096 \
    -n 512 \
    --chat-template llama3
