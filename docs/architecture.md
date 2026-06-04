# Fold7 Agent — 本地大模型操控手机

## 目标

- 语音/文字指令操控手机（例："给张三发微信说晚上吃饭"）
- 定时任务自动化（例：每天 9:00 打开钉钉打卡）

## 架构

```
┌─────────────────┐     HTTP/HTTPS   ┌──────────────────┐
│  Kimi 2.6 API   │ ◄──────────────► │  AutoX.js (App)  │
│  (Moonshot AI)  │   OpenAI API     │  Accessibility   │
│  或本地 llama   │   (JSON)         │  Service         │
└─────────────────┘                  └────────┬─────────┘
       ▲                                      │
       │ cron / alarm                         │ performAction()
       ▼                                      ▼
┌─────────────────┐                  ┌──────────────────┐
│  Termux crond   │                  │  Android UI      │
│  或 Mac cron    │                  │  微信 / 钉钉      │
└─────────────────┘                  └──────────────────┘
```

## 配置层

配置从代码中分离到 `config.js`（不纳入版本控制）：

| 字段 | 说明 |
|------|------|
| `provider` | `"kimi"` 或 `"local"` |
| `kimi.apiKey` | Moonshot API Key |
| `local.url` | llama.cpp server 地址 |
| `maxSteps` | 单任务最大执行步数 |

模板文件：`config.template.js`

## 模型层（可插拔）

| 模式 | 地址 | 协议 | 状态 |
|------|------|------|------|
| **Kimi 2.6**（当前） | `https://api.moonshot.cn/v1/chat/completions` | OpenAI 兼容 | ✅ |
| 本地 llama.cpp | `http://127.0.0.1:8080/v1/chat/completions` | OpenAI 兼容 | ✅ |

切换方式：修改 `config.js` 中的 `provider` 字段。

**注意**：llama.cpp server 已原生支持 OpenAI 兼容的 `/v1/chat/completions`，无需再使用旧的 `/completion` 端点。

## 通信协议

AutoX.js → 模型：

```json
POST /v1/chat/completions
{
  "model": "kimi-k2-6",
  "messages": [
    {"role": "system", "content": "你是一个手机助手..."},
    {"role": "user", "content": "给张三发微信说晚上吃饭\n当前屏幕：..."}
  ],
  "temperature": 0.3,
  "max_tokens": 256
}
```

模型返回结构化指令（由 system prompt 约束）：

```json
{
  "action": "click",
  "target": "微信图标",
  "text": null,
  "delay_ms": 1500,
  "reason": "需要打开微信应用"
}
```

## 执行层

`UIAutomator.js` 提供：

| 方法 | 说明 |
|------|------|
| `safeClick` | 按 text/desc 查找并点击 |
| `safeLongClick` | 长按 |
| `safeInput` | 输入文字（先清空） |
| `bezierSwipe` | 贝塞尔曲线滑动（防检测） |
| `getScreenContext` | 获取屏幕文字摘要传给模型 |
| `captureDebug` | 出错截图 |
| `executeCommand` | 执行模型返回的 JSON 指令 |

## 任务层

| 模块 | 用途 |
|------|------|
| `WeChatSend.js` | 微信发消息（含多种搜索回退） |
| `ClockIn.js` | 通用打卡（任意 App + 按钮） |
| `DingTalk.js` | 钉钉专用打卡（工作台→考勤打卡） |
| `SystemSettings.js` | 系统设置快捷操作 |

## 测试层

`test/mock.js` 提供 AutoX.js API 的 Node.js Mock，可在 Mac/PC 上：

```bash
node -r ./test/mock.js main.js --instruction="打开设置"
```

用于验证语法、逻辑流程和配置正确性，无需连接手机。

## 入口与分发

`main.js` 支持多种运行方式：

1. **AutoX.js 交互模式**：弹出对话框输入指令 → `runAgent()`
2. **智能指令（命令行）**：`--instruction="..."` → `runAgent()`
3. **快速任务（命令行）**：`--task=dingtalk --button="上班打卡"` → `quickTask()`（不调用模型，省 API 费用）
4. **定时任务（cron）**：`0 9 * * * node main.js --task=dingtalk`
5. **Node.js 模拟**：`node -r ./test/mock.js main.js`

## 安全与反检测

- 每次操作加随机延迟（500ms ~ 2000ms）
- 滑动操作模拟贝塞尔曲线（非直线）
- 微信操作间隔不小于 3 秒
- 避免连续快速点击同一位置
- 使用 Accessibility 读取节点文字，减少依赖坐标（适应不同分辨率）
- 出错自动截图保存到 `/sdcard/fold7-agent/`
