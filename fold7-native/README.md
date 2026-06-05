# Fold7 Agent Native

Fold7 Agent Native is a standalone Android APK. It does not depend on AutoX runtime.

## Architecture

- `MainActivity`: native app shell with Home, Chat, Manage, Docs, and Settings.
- `ModelClient`: OpenAI-compatible and Anthropic-compatible model calls.
- `ChatEngine`: confirmation-first workflow. The first reply confirms intent; action generation happens only after user confirmation.
- `ActionExecutor`: executes native action JSON, including app launch, settings launch, text tap, calibrated coordinate tap, input, wait, back, and home.
- `Fold7AccessibilityService`: optional execution bridge for cross-app clicks, text input, back, and home.

## Build

```bash
./build-apk.sh
```

The APK is written to:

```text
build/fold7-agent-native.apk
```

## Install

```bash
adb install --no-incremental -r build/fold7-agent-native.apk
adb shell am start -n com.fold7.agent/.MainActivity
```

## Model Flow

1. Configure provider, format, base URL, API key, and model in Settings.
2. In Chat, describe the phone task.
3. The model replies with intent confirmation and step breakdown.
4. Reply `正确` or `确认` to generate and execute the action plan.
5. Execution logs are shown inside the app.

## Coordinate Calibration

Settings includes a coordinate calibration panel. `tap_xy` actions apply:

```text
actualX = x * scaleX + offsetX
actualY = y * scaleY + offsetY
```

Prefer text-based actions (`tap_text`) whenever possible. Use calibrated coordinates only when the target UI has no stable text or accessibility node.

