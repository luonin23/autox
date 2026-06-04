# Fold7 Agent — 本地大模型操控手机

## 目标

- 语音/文字指令操控手机（例："给张三发微信说晚上吃饭"）
- 定时任务自动化（例：每天 9:00 打开钉钉打卡）

## 架构

```
┌─────────────────┐     HTTP/HTTPS   ┌──────────────────┐
│  Kimi 2.6 API   │ ◄──────────────► │  AutoX.js (App)  │
│  DeepSeek API   │   OpenAI API     │  Accessibility   │
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
| `provider` | `"kimi"` 或 `"deepseek"` 或 `"local"` |
| `kimi.apiKey` | Moonshot API Key |
| `deepseek.apiKey` | DeepSeek API Key |
| `local.url` | llama.cpp server 地址 |
| `maxSteps` | 单任务最大执行步数 |

模板文件：`config.template.js`

## 模型层（可插拔）

| 模式 | 地址 | 协议 | 状态 |
|------|------|------|------|
| **Kimi 2.6** | `https://api.moonshot.cn/v1/chat/completions` | OpenAI 兼容 | ✅ |
| **DeepSeek** | `https://api.deepseek.com/v1/chat/completions` | OpenAI 兼容 | ✅ |
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
    {"role": "system", "content": "你是 Fold7 Agent ..."},
    {"role": "user", "content": "给张三发微信说晚上吃饭\n当前屏幕：..."}
  ],
  "temperature": 0.3,
  "max_tokens": 1024
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

## 核心模块层

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

`SemanticParser.js` — 语义解析器：
- `parse(instruction)`：将自然语言转为结构化意图对象 `{intent, app, target, content}`
- 支持意图：send_message, clock_in, search, navigate, launch_app, system_setting, set_brightness, take_photo, alipay_paycode, alipay_scan, alipay_energy, go_back, go_home

`TaskPlanner.js` — 任务规划器：
- `plan(intention)`：将意图分解为可执行步骤序列 `[{action, target, text, delay_ms, reason}]`

`ScriptGenerator.js` — 脚本生成器：
- `generate(instruction, intention, planSteps)`：生成完整可独立运行的 `.js` 文件内容
- `generateInline(instruction, intention, planSteps)`：生成轻量内联脚本，适合 `engines.execScript` 直接执行

`ModelClient.js` — 模型客户端：
- `callModel(instruction, screenContext)`：调用大模型获取操作指令
- 支持 Kimi / DeepSeek / 本地 llama.cpp
- 内置重试机制和 JSON 容错解析

`Logger.js` — 日志与历史：
- `taskStart / taskEnd / stepLog / errorLog`：记录执行过程
- `readRecent(n)`：读取最近 n 条记录
- `todayStats()`：今日成功/失败统计

`StopHelper.js` — 全局停止控制：
- 音量上键监听，随时停止脚本
- `safeSleep(ms)`：可中断的分段睡眠

`ScreenshotCleaner.js` — 截图自动清理：
- 保留最近 50 张，删除超过 7 天的旧截图

## UI 层

`ChatUI.js` — 主交互界面（底部 Tab 导航）：
- **对话页**：自然语言输入 → 语义解析 → 任务规划 → 脚本生成 → 执行/保存
- **配置页**：模型提供商、API Key、模型名称、服务地址等配置，支持测试连接
- **历史页**：查看最近 30 条执行记录和今日统计

`ConfigUI.js` — 独立配置对话框（首次启动时弹出）

`history.js` — 独立历史查看器（终端 + UI 双模式）

## 任务层

| 模块 | 用途 |
|------|------|
| `WeChatSend.js` | 微信发消息（含多种搜索回退） |
| `ClockIn.js` | 通用打卡（任意 App + 按钮） |
| `DingTalk.js` | 钉钉专用打卡（工作台→考勤打卡） |
| `SystemSettings.js` | 系统设置快捷操作 |
| `Camera.js` | 相机拍照 |
| `Taobao.js` | 淘宝搜索 |
| `Alipay.js` | 支付宝付款码/扫一扫/蚂蚁森林 |
| `Navigation.js` | 高德/百度地图导航 |
| `Workflow.js` | JSON 工作流执行（支持条件分支、循环、变量替换） |

## 测试层

`test/mock.js` 提供 AutoX.js API 的 Node.js Mock，可在 Mac/PC 上：

```bash
# 运行完整测试套件
npm test

# 运行单个场景
npm run mock -- --instruction="打开设置"
```

测试覆盖范围：
- UIAutomator: safeClick / safeInput / executeCommand
- ModelClient: 结构化指令解析 / 重试机制
- SemanticParser: 语义解析准确性
- ScriptGenerator: 脚本生成完整性
- Workflow: 顺序执行 / 条件分支 / 变量替换
- 综合场景: Agent 主循环完整流程

## 入口与分发

`main.js` 支持多种运行方式：

1. **AutoX.js 交互模式**：启动 ChatUI（带底部 Tab：对话 + 配置 + 历史）
2. **智能指令（命令行）**：`--instruction="..."` → `runAgent()`
3. **快速任务（命令行）**：`--task=dingtalk --button="上班打卡"` → `quickTask()`（不调用模型，省 API 费用）
4. **工作流（命令行）**：`--workflow='{"steps":[...]}'` 或 `--workflowFile=../workflows/dingtalk-clockin.json`
5. **定时任务（cron）**：`0 9 * * * node main.js --task=dingtalk`
6. **Node.js 模拟**：`node -r ./test/mock.js main.js`

## 安全与反检测

- 每次操作加随机延迟（500ms ~ 2000ms）
- 滑动操作模拟贝塞尔曲线（非直线）
- 微信操作间隔不小于 3 秒
- 避免连续快速点击同一位置
- 使用 Accessibility 读取节点文字，减少依赖坐标（适应不同分辨率）
- 出错自动截图保存到 `/sdcard/fold7-agent/`
- 模型错误恢复：执行失败时把错误信息+屏幕上下文反馈给模型，自动重试
