# Fold7 Agent

用本地大模型（或 Kimi API）操控 Android 手机，实现语音/文字指令自动化。

## 功能

- 🗣️ **自然语言操控手机**："给张三发微信说晚上吃饭"
- ⏰ **定时任务**：每天 9:00 自动打卡
- 🤖 **模型可插拔**：Kimi 2.6 或本地 llama.cpp
- 🛡️ **无需 Root**：基于 Android AccessibilityService
- 🧪 **Mac 可模拟测试**：Node.js mock 环境跑通逻辑
- 🔄 **错误自恢复**：执行失败时自动反馈给模型重试
- 📋 **工作流编排**：JSON 定义复杂多步任务
- 📊 **执行日志**：历史记录与今日统计

## 项目结构

```
fold7-agent/
├── docs/
│   └── architecture.md          # 架构文档
├── workflows/                   # 预设工作流示例
│   ├── dingtalk-clockin.json
│   ├── wechat-send.json
│   └── open-settings.json
├── scripts/
│   ├── setup-termux.sh          # Termux 环境初始化（手机端）
│   ├── start-llama-server.sh    # 启动本地模型服务
│   ├── setup-mac-dev.sh         # Mac 模拟器开发环境
│   ├── setup-cron.sh            # Termux 定时任务配置
│   ├── setup-config.sh          # 🔥 交互式配置向导
│   └── install-autox.sh         # AutoX.js APK 自动安装
├── autojs-scripts/              # AutoX.js 自动化脚本
│   ├── core/
│   │   ├── ModelClient.js       # 模型 API 封装（Kimi / DeepSeek / Local）
│   │   ├── UIAutomator.js       # 无障碍操作封装
│   │   ├── Logger.js            # 📊 执行日志与统计
│   │   ├── ConfigUI.js          # 🎛️ 首次启动配置对话框
│   │   ├── ChatUI.js            # 💬 主交互界面（对话+配置+历史）
│   │   ├── StopHelper.js        # ⏹️ 统一停止控制（音量上键）
│   │   ├── ScreenshotCleaner.js # 🧹 截图自动清理
│   │   ├── SemanticParser.js    # 🔍 自然语言语义解析器
│   │   ├── TaskPlanner.js       # 📝 任务规划器（意图→步骤序列）
│   │   └── ScriptGenerator.js   # 📜 脚本生成器（完整脚本/内联脚本）
│   ├── tasks/
│   │   ├── WeChatSend.js        # 微信发消息（多策略回退）
│   │   ├── ClockIn.js           # 通用定时打卡
│   │   ├── DingTalk.js          # 钉钉专用打卡
│   │   ├── SystemSettings.js    # 系统设置（WiFi/亮度等）
│   │   ├── Camera.js            # 📷 相机拍照
│   │   ├── Taobao.js            # 🛒 淘宝搜索
│   │   ├── Alipay.js            # 💳 支付宝付款码/扫一扫/蚂蚁森林
│   │   ├── Navigation.js        # 🗺️ 高德/百度地图导航
│   │   └── Workflow.js          # 📋 JSON 工作流编排
│   ├── test/
│   │   ├── mock.js              # Node.js 模拟环境（带屏幕状态机）
│   │   ├── runner.js            # 🧪 自动化测试运行器
│   │   ├── semantic-test.js     # 🔍 语义解析器测试
│   │   ├── test-native.js       # 📱 原生系统 App 模拟器测试
│   │   └── test-basic.js        # ⚡ 基础 API 验证
│   ├── config.template.js       # 配置模板
│   ├── config.js                # 用户配置（含 API Key，不提交 Git）
│   ├── history.js               # 📜 独立执行历史查看器（AutoX.js UI / 终端）
│   └── main.js                  # 主入口
├── package.json                 # npm test / npm run mock
└── README.md
```

## 快速开始

### 1. 配置

**方式一：手机可视化配置（推荐）**

在 AutoX.js 中直接运行 `main.js`，如果检测到未配置，会自动弹出配置对话框：

- 模型提供商：下拉选择 Kimi / DeepSeek / 本地
- API Key：密码输入框
- 模型名称、本地服务地址
- 最大执行步数
- 测试连接按钮（保存前验证可用性）

填写后点击保存即可。

**方式二：命令行交互向导**

```bash
cd autojs-scripts
bash ../scripts/setup-config.sh
# 按提示选择模型、填入 API Key
```

**方式三：手动编辑**

```bash
cd autojs-scripts
cp config.template.js config.js
# 编辑 config.js 填入你的 Moonshot API Key
```

### 2. Mac 模拟器开发（推荐先在这测试逻辑）

```bash
# 安装 Android 工具
brew install --cask android-platform-tools android-commandlinetools

# 配置模拟器 + AutoX.js
bash scripts/setup-mac-dev.sh
```

模拟器里：
1. 打开 AutoX.js App
2. 授予**无障碍权限**
3. 把 `autojs-scripts/` 里的文件复制到 AutoX.js
4. 运行 `main.js`

**AutoX.js 一键安装到真机/模拟器**：
```bash
# USB 连接手机后
bash scripts/install-autox.sh

# 或无线 adb
bash scripts/install-autox.sh 192.168.1.100:5555
```

**Node.js 模拟测试（无需手机）**：
```bash
# 运行单个场景
npm run mock -- --instruction="打开设置"
npm run mock -- --task=dingtalk --button="上班打卡"

# 运行完整测试套件
npm test
```

### 3. 真机部署（Fold 7 / Termux）

```bash
# 在手机 Termux 里执行
bash scripts/setup-termux.sh

# 配置定时打卡
bash scripts/setup-cron.sh
```

然后安装 AutoX.js APK，导入脚本，同样填入 API Key。

## 模型配置

编辑 `autojs-scripts/config.js`：

```javascript
module.exports = {
    provider: "kimi", // "kimi" 或 "local"
    kimi: {
        apiKey: "your-api-key-here",
        model: "kimi-k2-6",
        url: "https://api.moonshot.cn/v1/chat/completions",
    },
    local: {
        apiKey: "",
        model: "local",
        url: "http://127.0.0.1:8080/v1/chat/completions",
    },
};
```

### 本地模型（llama.cpp）

```bash
# 启动 llama.cpp server（已支持 OpenAI 兼容 API）
~/llama.cpp/build/bin/llama-server \
    -m ~/models/your-model.gguf \
    --host 127.0.0.1 --port 8080 \
    -c 4096 --chat-template llama3
```

## 核心原理

1. **AutoX.js** 通过 AccessibilityService 读取屏幕节点树
2. 屏幕内容 + 用户指令 → **模型 API** → 返回结构化操作指令（JSON）
3. AutoX.js 执行指令（点击、输入、滑动）
4. 循环直到任务完成
5. **出错时自动截图，把错误反馈给模型，让它重试修复**

## 快速任务（不调用模型，省 API 费用）

适合定时任务，直接在 `main.js` 中调用或命令行传入：

```bash
# Termux / cron
node main.js --task=dingtalk --button="上班打卡"
node main.js --task=wechat --contact="张三" --message="晚上吃饭"
node main.js --task=settings --page=wifi
node main.js --task=camera --count=1
node main.js --task=taobao --keyword="iPhone" --clickFirst=true
node main.js --task=alipay_paycode
node main.js --task=alipay_scan
node main.js --task=navigate --destination="天安门" --mode=drive
```

## 工作流编排

用 JSON 定义复杂多步任务，支持条件分支、循环、变量替换：

```bash
# 直接传入 JSON
node main.js --workflow='{
  "name": "钉钉打卡流程",
  "steps": [
    {"action": "launch", "target": "钉钉", "delay": 5000},
    {"action": "click", "target": "工作台", "delay": 3000},
    {"action": "click", "target": "考勤打卡", "delay": 5000},
    {"action": "click", "target": "上班打卡", "delay": 3000},
    {"action": "if", "condition": {"type": "exists", "target": "确定"},
      "then": [{"action": "click", "target": "确定"}]},
    {"action": "done"}
  ]
}'

# 从文件加载（推荐）
node main.js --workflowFile=../workflows/dingtalk-clockin.json
node main.js --workflowFile=../workflows/wechat-send.json --var_contact="张三" --var_message="晚上吃饭"
```

变量替换：`--var_name=张三` 可在 workflow 中用 `$name` 引用。

## 测试

项目包含完整的 Node.js 模拟测试框架：

```bash
# 运行自动化测试套件
npm test

# 测试覆盖范围：
# - UIAutomator: safeClick / safeInput / executeCommand
# - ModelClient: 结构化指令解析 / 重试机制 / Markdown 容错清理
# - SemanticParser: 发消息 / 打卡 / 导航 / 打开应用 等意图解析
# - ScriptGenerator: 完整脚本 / 内联脚本生成
# - Workflow: 顺序执行 / 条件分支 / 变量替换
# - 综合场景: Agent 主循环完整流程
```

## 工具脚本

### 查看执行历史

在 AutoX.js 中运行 `history.js`，查看最近 50 条执行记录和今日统计：

```bash
# AutoX.js 中打开并运行 history.js
```

界面显示：
- 今日成功/失败次数统计
- 时间线形式的任务记录（开始、步骤、错误、完成）

### 截图自动清理

每次任务结束后，自动清理 `/sdcard/fold7-agent/` 下的 debug 截图：
- 保留最近 **50 张**
- 删除超过 **7 天** 的旧截图
- 防止截图堆积占用存储空间

## 安全与反检测

- 每次操作加随机延迟（500ms ~ 2000ms）
- 滑动操作模拟**贝塞尔曲线**（非直线，更像真人）
- 微信操作间隔不小于 3 秒
- 避免连续快速点击同一位置
- 使用 Accessibility 读取节点文字，减少依赖坐标（适应不同分辨率）
- **出错自动截图**保存现场（`/sdcard/fold7-agent/`）
- **模型错误恢复**：执行失败时把错误信息+屏幕上下文反馈给模型，自动重试
- **随时停止**：运行中按 **音量上键** 可立即停止脚本（所有任务模块均支持中断）

## License

MIT
