# Fold7 Agent — AI 驱动的 Android 自动化框架

## 架构概述（v2）

Fold7 Agent 是一个**对话式 Android 自动化框架**。核心设计理念：

> **用户通过自然语言对话描述需求 → AI 生成 AutoX.js 脚本 → 框架执行并自动调试 → 直到成功**

```
┌─────────────┐     自然语言指令      ┌─────────────┐
│   用户输入   │ ──────────────────▶ │   ChatUI    │
└─────────────┘                     └──────┬──────┘
                                           │
                              ┌────────────▼────────────┐
                              │      ChatEngine         │
                              │  ┌───────────────────┐  │
                              │  │  1. 调用 AI 生成脚本 │  │
                              │  │  2. 执行脚本        │  │
                              │  │  3. 监控日志        │  │
                              │  │  4. 出错 → AI 修复  │  │
                              │  │  5. 重试直到成功    │  │
                              │  └───────────────────┘  │
                              └────────────┬────────────┘
                                           │
                              ┌────────────▼────────────┐
                              │    ScriptExecutor       │
                              │   (在 AutoX.js 中运行)   │
                              └─────────────────────────┘
```

## 项目结构

```
fold7-agent/
├── autojs-scripts/              # AutoX.js 侧代码
│   ├── main.js                  # 入口：启动对话 UI 或 CLI 执行
│   ├── config.template.js       # 配置文件模板
│   ├── core/                    # 核心基础设施
│   │   ├── UIAutomator.js       # 无障碍操作封装
│   │   ├── StopHelper.js        # 停止控制
│   │   ├── Logger.js            # 日志记录
│   │   ├── ModelClient.js       # 大模型客户端
│   │   ├── ConfigUI.js          # 模型配置界面
│   │   ├── ChatUI.js            # 对话界面
│   │   └── ScreenshotCleaner.js # 截图清理
│   ├── agent/                   # AI Agent 引擎
│   │   ├── ChatEngine.js        # 对话引擎：生成→执行→调试闭环
│   │   └── ScriptExecutor.js    # 脚本执行与监控
│   └── test/                    # 测试相关
├── prompts/                     # 提示词工程
│   └── system-prompt.md         # AI 系统提示词
├── standards/                   # 规范标准
│   ├── coding-standard.md       # AutoX.js 编码规范
│   └── rhino-compatibility.md   # Rhino 引擎兼容性规范
├── docs/
│   └── architecture.md          # 架构文档
└── scripts/                     # 环境搭建脚本
```

## 快速开始

### 1. 配置模型

复制配置模板并填入 API Key：

```bash
cp autojs-scripts/config.template.js autojs-scripts/config.js
# 编辑 config.js，填入你的 Kimi / DeepSeek API Key
```

### 2. 启动

**AutoX.js 模式（推荐）：**
1. 将 `autojs-scripts/` 文件夹推送到手机 `/sdcard/AutoX/fold7-agent/`
2. 在 AutoX.js 中打开 `main.js` 并运行
3. 首次运行会提示配置模型（API Key、Base URL 等）
4. 配置完成后进入对话界面，输入自然语言指令

**命令行模式（Termux / 测试）：**
```bash
cd autojs-scripts
node main.js --instruction="打开微信"
```

## 使用示例

在对话界面输入：

- `给张三发微信说晚上一起吃饭` → AI 生成微信发消息脚本并执行
- `每天早上7:15在飞书打卡` → AI 生成定时打卡脚本（可保存后设置定时任务）
- `打开钉钉，点击上班打卡` → AI 生成钉钉打卡脚本并执行
- `在淘宝搜索蓝牙耳机并点击第一个结果` → AI 生成淘宝搜索脚本

## v2 核心变更

| 特性 | v1（旧） | v2（新） |
|------|---------|---------|
| 任务执行 | 硬编码脚本（tasks/*.js） | AI 动态生成脚本 |
| 意图理解 | 硬编码 SemanticParser | AI 自然语言理解 |
| 任务规划 | 硬编码 TaskPlanner | AI 自主规划步骤 |
| 错误处理 | 简单重试 | AI 自动分析修复 |
| 扩展性 | 需手动写脚本 | 对话即可生成新能力 |

## 核心模块说明

### ChatEngine.js

管理完整的 **生成 → 执行 → 调试 → 修复** 闭环：

1. 接收用户指令
2. 调用 ModelClient 生成脚本
3. 通过 ScriptExecutor 执行
4. 监控日志，捕获错误
5. 出错时自动将错误日志 + 屏幕截图传给 AI 修复
6. 重试直到成功或达到最大修复次数（默认 3 次）

### ScriptExecutor.js

- 在独立线程中执行 AI 生成的脚本
- 通过 `events.observeConsole()` 实时捕获日志
- 检测执行成功/失败/超时
- 返回完整执行报告

### ModelClient.js

- 封装 Kimi / DeepSeek / 本地模型调用
- 支持 OpenAI 兼容格式 和 Anthropic 原生格式
- SYSTEM_PROMPT 包含：框架 API、应用知识、编码规范、Rhino 兼容性规则

## 编码规范

- 所有脚本必须符合 [Rhino 兼容性规范](standards/rhino-compatibility.md)
- 脚本编写遵循 [编码规范](standards/coding-standard.md)
- 优先使用 `var`，避免 `const`/`let` 的重复声明问题
- 不要使用箭头函数、模板字符串、解构赋值、Promise/async-await

## License

MIT
