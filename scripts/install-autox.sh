#!/bin/bash
# Fold7 Agent — AutoX.js APK 自动下载安装
# 支持: Android 真机(adb) / Mac 模拟器
# 用法: bash install-autox.sh [device_ip:port]

set -e

APK_VERSION="v6.5.7"
APK_URL="https://github.com/kkevsekk1/AutoX/releases/download/${APK_VERSION}/app-v6.5.7-arm64-v8a-release.apk"
APK_FILE="/tmp/autox-${APK_VERSION}.apk"

echo "=== AutoX.js 安装工具 ==="
echo "版本: ${APK_VERSION}"
echo ""

# 1. 检测连接方式
DEVICE=""
if [ -n "$1" ]; then
    echo "[1/5] 通过网络连接设备: $1"
    adb connect "$1" || true
    DEVICE="-s $1"
fi

# 2. 检查 adb
echo "[2/5] 检查 adb 连接..."
if ! adb ${DEVICE} devices | grep -q "device$"; then
    echo "❌ 错误: 未检测到已连接的 Android 设备"
    echo ""
    echo "解决方案:"
    echo "  1. 真机: 开启 USB 调试，用数据线连接电脑"
    echo "  2. 真机(无线): 先执行 adb tcpip 5555，然后 adb connect 手机IP:5555"
    echo "  3. 模拟器: 确保模拟器已启动"
    echo ""
    echo "然后重新运行本脚本，或指定设备IP:"
    echo "  bash install-autox.sh 192.168.1.100:5555"
    exit 1
fi

adb ${DEVICE} shell echo "设备已连接"

# 3. 下载 APK
echo "[3/5] 下载 AutoX.js APK..."
if [ ! -f "$APK_FILE" ]; then
    curl -L -o "$APK_FILE" "$APK_URL" || {
        echo "❌ 下载失败，请手动下载:"
        echo "   $APK_URL"
        exit 1
    }
else
    echo "APK 已存在，跳过下载"
fi

# 4. 安装
echo "[4/5] 安装 AutoX.js..."
adb ${DEVICE} install -r -d "$APK_FILE" || {
    echo "⚠️ 安装失败，尝试降级安装..."
    adb ${DEVICE} install -r -d -g "$APK_FILE" || {
        echo "❌ 安装失败，请检查:"
        echo "   - 是否已开启'允许安装未知来源应用'"
        echo "   - 设备存储空间是否充足"
        exit 1
    }
}

# 5. 启动并提示
echo "[5/5] 启动 AutoX.js..."
adb ${DEVICE} shell am start -n org.autojs.autoxjs.v6/org.autojs.autojs.ui.splash.SplashActivity || true

echo ""
echo "=== 安装完成 ==="
echo ""
echo "⚠️  重要：请在手机上完成以下操作"
echo "   1. 打开 AutoX.js App"
echo "   2. 授予'无障碍权限'（设置 → 无障碍 → AutoX.js → 开启）"
echo "   3. 授予'悬浮窗权限'（如需显示日志）"
echo "   4. 授予'后台运行'权限"
echo ""
echo "接下来:"
echo "   1. 将 autojs-scripts/ 文件夹复制到手机"
echo "      adb push autojs-scripts /sdcard/AutoX/"
echo "   2. 在 AutoX.js 中导入并运行 main.js"
echo ""
