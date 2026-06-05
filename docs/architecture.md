# Fold7 Agent Architecture

Fold7 Agent is an AutoX.js app shell for AI-generated Android automation scripts.

The app owns model configuration, conversation state, prompt policy, script execution, log monitoring, and automatic repair. Generated scripts are intentionally narrow: they only perform the requested phone automation through framework APIs.

## Runtime Flow

```
User message
  -> main.js Chat tab
  -> ChatEngine
  -> ModelClient + system prompt
  -> generated AutoX.js script
  -> ScriptExecutor
  -> logs / error / screen context
  -> AI repair loop when needed
```

## App Tabs

| Tab | Responsibility |
| --- | --- |
| Home | Current model status and execution statistics |
| Chat | Natural-language request, generated script preview, monitored execution |
| Manage | Saved generated scripts: run or delete |
| Docs | In-app coding rules, app knowledge, framework API summary |
| Settings | Kimi, DeepSeek, and local model configuration |

## Modules

| Module | Role |
| --- | --- |
| `main.js` | AutoX app shell with five tabs |
| `core/AppConfig.js` | Reads/writes runtime model configuration on the device |
| `core/ModelClient.js` | Calls Kimi, DeepSeek, or local OpenAI-compatible models |
| `agent/ChatEngine.js` | Conversation and generate-run-repair orchestration |
| `agent/ScriptExecutor.js` | Executes generated scripts in a monitored engine |
| `core/UIAutomator.js` | Safe phone UI actions for generated scripts |
| `core/Logger.js` | History and daily statistics |
| `core/StopHelper.js` | Volume-up stop control for generated scripts |

## Architectural Rules

1. Model calls stay in the app framework.
2. Generated scripts must not contain API keys, model clients, chat loops, or prompt text.
3. Generated scripts use `UIAutomator`, `StopHelper`, and `Logger`.
4. Errors are fed back to `ChatEngine`, which asks the model for a repaired full script and reruns it.
5. Old hardcoded task parsers/planners/workflows are not part of this architecture.

## Verification

Run local regression tests:

```bash
npm test
```

Deploy to emulator:

```bash
adb shell rm -rf /sdcard/AutoX/fold7-agent
adb shell mkdir -p /sdcard/AutoX/fold7-agent
adb push autojs-scripts /sdcard/AutoX/fold7-agent/
```
