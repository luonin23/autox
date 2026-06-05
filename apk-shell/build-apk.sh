#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHELL_DIR="$ROOT/apk-shell"
APP_DIR="$SHELL_DIR/app/src/main"
OUT_DIR="$SHELL_DIR/build"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
BUILD_TOOLS="$SDK/build-tools/34.0.0"
ANDROID_JAR="$SDK/platforms/android-34/android.jar"

rm -rf "$OUT_DIR" "$APP_DIR/assets/autojs-scripts"
mkdir -p "$OUT_DIR/classes" "$OUT_DIR/dex" "$APP_DIR/assets"
cp -R "$ROOT/autojs-scripts" "$APP_DIR/assets/autojs-scripts"

"$BUILD_TOOLS/aapt2" compile --dir "$APP_DIR/res" -o "$OUT_DIR/compiled.zip"
"$BUILD_TOOLS/aapt2" link \
  -I "$ANDROID_JAR" \
  --manifest "$APP_DIR/AndroidManifest.xml" \
  -A "$APP_DIR/assets" \
  --java "$OUT_DIR/gen" \
  --min-sdk-version 23 \
  --target-sdk-version 28 \
  -o "$OUT_DIR/base.apk" \
  "$OUT_DIR/compiled.zip"

javac -source 1.8 -target 1.8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "$OUT_DIR/classes" \
  $(find "$APP_DIR/java" "$OUT_DIR/gen" -name '*.java' -print)

"$BUILD_TOOLS/d8" \
  --lib "$ANDROID_JAR" \
  --output "$OUT_DIR/dex" \
  $(find "$OUT_DIR/classes" -name '*.class' -print)

cd "$OUT_DIR/dex"
zip -qr "$OUT_DIR/base.apk" classes.dex
cd "$ROOT"

KEYSTORE="$SHELL_DIR/fold7-debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair \
    -keystore "$KEYSTORE" \
    -storepass fold7debug \
    -keypass fold7debug \
    -alias fold7 \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Fold7 Agent,O=Fold7,C=CN" >/dev/null
fi

"$BUILD_TOOLS/zipalign" -f 4 "$OUT_DIR/base.apk" "$OUT_DIR/fold7-agent-shell-unsigned.apk"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:fold7debug \
  --key-pass pass:fold7debug \
  --out "$OUT_DIR/fold7-agent-shell.apk" \
  "$OUT_DIR/fold7-agent-shell-unsigned.apk"

"$BUILD_TOOLS/apksigner" verify "$OUT_DIR/fold7-agent-shell.apk"
echo "$OUT_DIR/fold7-agent-shell.apk"
