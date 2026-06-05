# Fold7 Agent

Fold7 Agent is an AutoX.js app framework for AI-generated Android automation.

The app itself provides model configuration, conversation, prompt policy, script generation, monitored execution, log capture, and automatic repair. Generated scripts only perform phone automation steps; they do not contain model calls, API keys, chat loops, or agent logic.

## App Structure

Run `autojs-scripts/main.js` in AutoX.js. The app opens with five bottom tabs:

| Tab | Function |
| --- | --- |
| Home | Model status and today's execution statistics |
| Chat | Natural language -> AI-generated script -> execute -> auto repair |
| Manage | View, run, and delete saved generated scripts |
| Docs | Coding rules, app operation knowledge, framework API |
| Settings | Kimi, DeepSeek, and local model configuration |

## Runtime Flow

```
User instruction
  -> Chat tab
  -> ChatEngine
  -> ModelClient
  -> generated AutoX.js script
  -> ScriptExecutor
  -> log/error/screen monitoring
  -> AI repair and retry when needed
```

## Project Layout

```
autojs-scripts/
├── main.js
├── config.template.js
├── agent/
│   ├── ChatEngine.js
│   └── ScriptExecutor.js
├── core/
│   ├── AppConfig.js
│   ├── ModelClient.js
│   ├── UIAutomator.js
│   ├── StopHelper.js
│   ├── Logger.js
│   └── ScreenshotCleaner.js
└── test/
    ├── mock.js
    └── runner.js
```

## Configure

Settings can be edited inside the app. For manual setup:

```bash
cp autojs-scripts/config.template.js autojs-scripts/config.js
```

`config.js` is runtime configuration and should not be committed with real API keys.

## Deploy To Emulator

```bash
adb shell rm -rf /sdcard/AutoX/fold7-agent
adb shell mkdir -p /sdcard/AutoX/fold7-agent
adb push autojs-scripts /sdcard/AutoX/fold7-agent/
```

Then open AutoX.js and run:

```text
/sdcard/AutoX/fold7-agent/autojs-scripts/main.js
```

## Test

```bash
npm test
```

The test suite verifies the current app architecture: configuration, model call shape, framework UI actions, and logging. Old hardcoded workflow/parser/planner scripts have been removed from the active framework.
