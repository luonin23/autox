#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS="$SDK/build-tools/34.0.0"
PLATFORM="$SDK/platforms/android-34/android.jar"
APP="$ROOT/app"
OUT="$ROOT/build"
KEYSTORE="$ROOT/fold7-debug.keystore"
PKG="com.fold7.agent"

rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/dex" "$OUT/compiled"

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -storepass android \
    -keypass android \
    -alias fold7debug \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Fold7 Agent,O=Fold7,C=CN" >/dev/null
fi

"$BUILD_TOOLS/aapt2" compile --dir "$APP/src/main/res" -o "$OUT/compiled/resources.zip"
"$BUILD_TOOLS/aapt2" link \
  -o "$OUT/unsigned.apk" \
  -I "$PLATFORM" \
  --manifest "$APP/src/main/AndroidManifest.xml" \
  --min-sdk-version 23 \
  --target-sdk-version 28 \
  "$OUT/compiled/resources.zip" \
  --java "$OUT/generated"

find "$APP/src/main/java" "$OUT/generated" -name "*.java" > "$OUT/sources.list"
javac -encoding UTF-8 -source 1.8 -target 1.8 \
  -bootclasspath "$PLATFORM" \
  -d "$OUT/classes" \
  @"$OUT/sources.list"

find "$OUT/classes" -name "*.class" > "$OUT/classes.list"
"$BUILD_TOOLS/d8" --lib "$PLATFORM" --min-api 23 --output "$OUT/dex" @"$OUT/classes.list"
cp "$OUT/unsigned.apk" "$OUT/with-dex.apk"
cd "$OUT/dex"
zip -qr "$OUT/with-dex.apk" classes.dex
cd "$ROOT"

"$BUILD_TOOLS/zipalign" -p -f 4 "$OUT/with-dex.apk" "$OUT/aligned.apk"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$OUT/fold7-agent-native.apk" \
  "$OUT/aligned.apk"

"$BUILD_TOOLS/apksigner" verify "$OUT/fold7-agent-native.apk"
echo "$OUT/fold7-agent-native.apk"
