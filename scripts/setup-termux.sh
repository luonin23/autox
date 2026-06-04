#!/data/data/com.termux/files/usr/bin/bash
# Fold7 Agent — Termux 环境初始化

set -e

echo "=== Fold7 Agent Termux Setup ==="

# 1. 更新包列表
echo "[1/6] Updating packages..."
pkg update -y

# 2. 安装依赖
echo "[2/6] Installing dependencies..."
pkg install -y git cmake clang ninja llvm wget curl cronie termux-api

# 3. 克隆 llama.cpp
echo "[3/6] Cloning llama.cpp..."
if [ ! -d "$HOME/llama.cpp" ]; then
    git clone --depth 1 https://github.com/ggerganov/llama.cpp.git "$HOME/llama.cpp"
fi

# 4. 编译（Android ARM64 优化）
echo "[4/6] Building llama.cpp..."
cd "$HOME/llama.cpp"
cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DLLAMA_NATIVE=OFF \
    -DLLAMA_ARM_NEON=ON \
    -DLLAMA_OPENMP=OFF

cmake --build build --config Release -j$(nproc)

echo "[5/6] llama.cpp built successfully"
ls -lh build/bin/llama-server

# 5. 创建模型目录
echo "[6/6] Creating directories..."
mkdir -p "$HOME/models"
mkdir -p "$HOME/fold7-agent/scripts"
mkdir -p "$HOME/tmp"

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "  1. Download a GGUF model to ~/models/"
echo "     Example: wget -P ~/models https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf"
echo "  2. Start server: ~/llama.cpp/build/bin/llama-server -m ~/models/your-model.gguf --host 127.0.0.1 --port 8080"
