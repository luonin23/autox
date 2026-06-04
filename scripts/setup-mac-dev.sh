#!/bin/bash
# Fold7 Agent — Mac 本地开发环境配置（Android Emulator + AutoX.js）

set -e

echo "=== Fold7 Agent Mac Dev Setup ==="

# 1. 检测 Android SDK 路径
if [ -d "/opt/homebrew/share/android-commandlinetools" ]; then
    SDK_ROOT="/opt/homebrew/share/android-commandlinetools"
elif [ -d "/usr/local/share/android-commandlinetools" ]; then
    SDK_ROOT="/usr/local/share/android-commandlinetools"
else
    echo "Error: android-commandlinetools not found. Run: brew install --cask android-commandlinetools"
    exit 1
fi

export ANDROID_HOME="$SDK_ROOT"
export PATH="$ANDROID_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

echo "SDK_ROOT: $SDK_ROOT"

# 2. 安装必要组件
echo "[1/5] Installing SDK components..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platform-tools" "emulator" "platforms;android-34" "system-images;android-34;google_apis_playstore;arm64-v8a"

# 3. 创建 AVD
echo "[2/5] Creating AVD..."
AVD_NAME="fold7_agent"
if ! avdmanager list avd | grep -q "$AVD_NAME"; then
    avdmanager create avd -n "$AVD_NAME" -k "system-images;android-34;google_apis_playstore;arm64-v8a" -d "pixel_7" --force
    echo "hw.keyboard=yes" >> ~/.android/avd/${AVD_NAME}.avd/config.ini
    echo "disk.dataPartition.size=4G" >> ~/.android/avd/${AVD_NAME}.avd/config.ini
fi

# 4. 下载 AutoX.js APK
echo "[3/5] Downloading AutoX.js..."
APK_DIR="$HOME/Downloads"
mkdir -p "$APK_DIR"
APK_URL="https://github.com/kkevsekk1/AutoX/releases/download/v6.5.7/app-v6.5.7-arm64-v8a-release.apk"
APK_FILE="$APK_DIR/autox-v6.5.7.apk"

if [ ! -f "$APK_FILE" ]; then
    curl -L -o "$APK_FILE" "$APK_URL" || echo "Warning: Failed to download AutoX.js APK, please download manually"
else
    echo "AutoX.js APK already exists"
fi

# 5. 启动模拟器
echo "[4/5] Starting emulator..."
emulator -avd "$AVD_NAME" -no-snapshot-load -gpu host &
EMULATOR_PID=$!
sleep 30

# 6. 安装 AutoX.js
echo "[5/5] Installing AutoX.js..."
if [ -f "$APK_FILE" ]; then
    adb wait-for-device
    adb install -r "$APK_FILE"
    echo "✅ AutoX.js installed"
else
    echo "⚠️ Please install AutoX.js manually after emulator starts"
fi

echo ""
echo "=== Setup Complete ==="
echo "Emulator PID: $EMULATOR_PID"
echo ""
echo "Next steps:"
echo "  1. Open AutoX.js in emulator"
echo "  2. Grant Accessibility permission"
echo "  3. Copy autojs-scripts/ files into AutoX.js"
echo "  4. Update main.js with your Kimi API Key"
echo "  5. Run main.js"
