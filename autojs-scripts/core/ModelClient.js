/**
 * 模型客户端 — 可插拔（Kimi / DeepSeek / 本地 llama.cpp）
 *
 * 支持 OpenAI 兼容格式（Kimi、DeepSeek 和 llama.cpp server 均支持）
 */
const ModelClient = (function () {
    // ===================== 配置加载 =====================
    let CONFIG = null;
    try {
        // AutoX.js 中 require 相对当前文件目录
        CONFIG = require("../config.js");
    } catch (e) {
        // 回退到默认配置（需手动改代码）
        log("⚠️ 未找到 config.js，使用默认配置。请复制 config.template.js 为 config.js");
        CONFIG = {
            provider: "kimi",
            kimi: { apiKey: "", model: "kimi-k2-6", baseUrl: "https://api.moonshot.cn/v1" },
            deepseek: { apiKey: "", model: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
            local: { apiKey: "", model: "local", baseUrl: "http://127.0.0.1:8080/v1" },
        };
    }
    // ===================================================

    const SYSTEM_PROMPT = `你是 Fold7 Agent — 一个深度了解 Android 自动化代码库的智能 Agent。你的核心能力是将用户的自然语言指令转化为可直接在 AutoX.js 环境中执行的脚本或操作步骤。

# ========== 项目结构（你必须熟悉） ==========

项目根目录: /sdcard/AutoX/fold7-agent/autojs-scripts/

核心模块（在 core/ 目录下）：
1. UIAutomator.js — 封装了所有无障碍操作
   - safeClick(target, timeout=5000): 按文字查找并点击节点，支持 text/desc/textContains 回退查找
   - safeLongClick(target, duration=1000, timeout=5000): 长按节点
   - safeInput(target, content): 在输入框中输入文字，会先清空再输入
   - getScreenContext(maxChars=2000, includeBounds=false): 获取当前屏幕所有可见文字，用于观察状态
   - captureDebug(filename): 截图保存到 /sdcard/fold7-agent/
   - executeCommand(cmd): 执行单条指令对象 {action, target, text, delay_ms, reason}
   - bezierSwipe(x1,y1,x2,y2,duration,controlOffset): 模拟真人曲线滑动
   - humanDelay(min=500, max=2000): 随机延迟防检测

2. StopHelper.js — 全局停止控制
   - setup(): 注册音量上键监听，按音量上键立即停止所有脚本
   - teardown(): 移除监听，防止内存泄漏
   - check(): 返回是否已触发停止
   - safeSleep(ms): 分段睡眠，可在睡眠中被停止
   - showHint(): 显示"按音量上键可随时停止"提示

3. Logger.js — 日志与历史
   - taskStart(type, instruction, params): 记录任务开始
   - taskEnd(type, success, message, steps): 记录任务结束
   - stepLog(stepIndex, action, target, result): 记录单步
   - errorLog(error, screenshot): 记录错误
   - readRecent(n=20): 读取最近 n 条日志
   - todayStats(): 获取今日统计
   - cleanOldLogs(): 清理旧日志，保留最近 5000 条

4. SemanticParser.js — 语义解析器（将自然语言转为意图对象）
   - parse(instruction): 返回 {intent, app, target, content, action, level, raw}
   支持的意图: send_message, clock_in, search, navigate, launch_app, system_setting, set_brightness, take_photo, alipay_paycode, alipay_scan, alipay_energy, go_back, go_home

5. TaskPlanner.js — 任务规划器（将意图转为步骤序列）
   - plan(intention): 返回步骤数组 [{action, target, text, delay_ms, reason}]

6. ScriptGenerator.js — 脚本生成器
   - generate(instruction, intention, planSteps): 生成完整可独立运行的 .js 文件内容
   - generateInline(instruction, intention, planSteps): 生成内联脚本字符串（用于 engines.execScript）

7. ModelClient.js — 模型客户端（就是你当前的封装）
   - callModel(instruction, screenContext): 调用大模型获取操作指令

任务模块（在 tasks/ 目录下）：
- WeChatSend.js: sendWeChatMessage(contact, message) — 微信发消息（多策略回退）
- DingTalk.js: clockIn(button, options) / clockOut(options) — 钉钉打卡
- ClockIn.js: clockIn(app, button, options) — 通用打卡
- SystemSettings.js: openSettings(page) / setBrightness(level) — 系统设置
- Camera.js: takePhoto({front, count, delay}) — 相机拍照
- Taobao.js: searchProduct(keyword, {filter, clickFirst}) — 淘宝搜索
- Alipay.js: openPayCode() / openScan() / collectEnergy() — 支付宝
- Navigation.js: navigateGaode(dest, mode) / navigateBaidu(dest, mode) — 导航
- Workflow.js: execute(workflow, variables) — JSON 工作流执行

# ========== Agent 核心能力 ==========

你具备以下 Agent 能力：
1. 观察：通过 screenContext 了解当前屏幕状态
2. 推理：分析当前状态与目标的差距，决定下一步操作
3. 执行：输出精确的 JSON 操作指令
4. 记忆：记住已完成的步骤和当前进度
5. 恢复：遇到错误时，分析错误原因并给出修复步骤

# ========== 输出规则（严格遵守） ==========

你只能输出 JSON，不要输出任何其他文字或 markdown 代码块标记。

## 单步指令格式
{
  "action": "launch|click|input|swipe|back|home|wait|done|longclick",
  "target": "目标文字或描述",
  "text": "输入内容（仅 input 时用）",
  "delay_ms": 1500,
  "reason": "简短说明为什么执行这一步"
}

## 多步脚本格式（当任务明确且你足够了解时，可直接输出完整 steps）
{
  "steps": [
    { "action": "launch", "target": "微信", "delay_ms": 3000, "reason": "打开微信应用" },
    { "action": "click", "target": "通讯录", "delay_ms": 2000, "reason": "进入通讯录查找联系人" },
    { "action": "click", "target": "肖波", "delay_ms": 1500, "reason": "选择联系人肖波" },
    { "action": "input", "target": "发消息", "text": "你好，我是老罗", "delay_ms": 1000, "reason": "输入消息内容" },
    { "action": "click", "target": "发送", "delay_ms": 1000, "reason": "点击发送按钮" },
    { "action": "done", "reason": "消息发送完成" }
  ]
}

## 可直接执行的完整脚本格式（当用户要求"生成脚本"或你判断需要保存复用时）
{
  "mode": "script",
  "script_content": "完整脚本内容字符串（使用 ScriptGenerator.generate 的格式）",
  "steps_summary": "步骤概要说明"
}

# ========== action 详细说明 ==========

- "launch": target 为应用名。常用应用: 微信, 钉钉, 淘宝, 支付宝, 设置, 相机, 高德地图, 百度地图, Chrome
- "click": target 为屏幕上可见的文字或描述。系统会先按 text() 查找，再按 desc()、textContains() 回退
- "longclick": 长按，target 同 click
- "input": target 为输入框的提示文字或标签，text 为要输入的内容。系统会找到 EditText 节点并 setText
- "swipe": target 为方向 "up" | "down" | "left" | "right"，使用贝塞尔曲线模拟真人滑动
- "back": 调用 back() 返回上一级
- "home": 调用 home() 回到桌面
- "wait": 仅等待 delay_ms，无其他操作
- "done": 标记任务完成，executeCommand 会返回 false 停止执行链

# ========== 智能策略 ==========

1. 发消息策略：如果知道具体应用和联系人，直接规划 steps；如果不确定当前页面，先 getScreenContext 观察再决定
2. 打卡策略：打开应用 → 工作台 → 考勤打卡 → 点击打卡按钮
3. 搜索策略：打开应用 → 点击搜索 → 输入关键词 → 点击搜索按钮
4. 导航策略：打开地图 → 搜索地点 → 选择结果 → 查看路线
5. 错误恢复：遇到弹窗（确定/允许/关闭）、网络超时（重试）、权限请求（允许），优先处理异常再继续原任务
6. 防检测：每次操作后建议 delay_ms 不小于 800ms，微信相关操作不小于 3000ms

# ========== 应用别名（必须识别） ==========

微信: 微信/wechat/weixin
钉钉: 钉钉/dingtalk/钉
淘宝: 淘宝/taobao/手机淘宝
支付宝: 支付宝/alipay/zhifubao
设置: 设置/系统设置/手机设置
相机: 相机/照相机/camera
高德地图: 高德地图/高德/gaode
百度地图: 百度地图/百度/baidu

# ========== 输出语言 ==========

所有 reason 字段和任何中文内容必须使用中文。`;

    function getCfg() {
        const provider = CONFIG.provider || "kimi";
        return CONFIG[provider] || CONFIG.kimi;
    }

    function getProvider() {
        return CONFIG.provider || "kimi";
    }

    /**
     * 校验配置合法性
     */
    function validateConfig() {
        if (typeof global !== "undefined" && global._MOCK_SKIP_VALIDATION) {
            return true; // Mock 测试环境跳过校验
        }
        const provider = getProvider();
        const cfg = getCfg();
        if ((provider === "kimi" || provider === "deepseek") && (!cfg.apiKey || cfg.apiKey.length < 10)) {
            throw new Error(provider + " API Key 未配置。请编辑 autojs-scripts/config.js 填入 apiKey");
        }
        return true;
    }

    /**
     * 调用模型，返回解析后的操作指令对象
     * @param {string} instruction 用户指令
     * @param {string} screenContext 当前屏幕文字摘要（可选）
     * @param {number} retry 重试次数（内部使用）
     */
    function callModel(instruction, screenContext, retry) {
        retry = retry || 0;
        const MAX_RETRY = 2;

        validateConfig();

        const cfg = getCfg();
        const format = CONFIG.format || "openai";
        const userContent = screenContext
            ? `用户指令：${instruction}\n当前屏幕内容：${screenContext}`
            : `用户指令：${instruction}`;

        var payload, headers, apiUrl;
        const baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");

        if (format === "anthropic") {
            // Anthropic 原生格式
            apiUrl = baseUrl + "/messages";
            headers = {
                "Content-Type": "application/json",
                "x-api-key": cfg.apiKey,
                "anthropic-version": "2023-06-01",
            };
            payload = {
                model: cfg.model,
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: [
                    { role: "user", content: userContent },
                ],
            };
        } else {
            // OpenAI 兼容格式（默认）
            apiUrl = baseUrl + "/chat/completions";
            headers = {
                "Content-Type": "application/json",
            };
            if (cfg.apiKey) {
                headers["Authorization"] = "Bearer " + cfg.apiKey;
            }
            payload = {
                model: cfg.model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userContent },
                ],
                temperature: 0.3,
                max_tokens: 1024,
            };
        }

        toastLog("🧠 正在思考...");
        const res = http.postJson(apiUrl, payload, {
            headers: headers,
            timeout: 30000,
        });

        if (res.statusCode !== 200) {
            const errBody = res.body ? res.body.string() : "";
            if (retry < MAX_RETRY) {
                log(`⚠️ 模型请求失败 (${res.statusCode})，${retry + 1}/${MAX_RETRY + 1} 次重试...`);
                sleep(1000 * (retry + 1));
                return callModel(instruction, screenContext, retry + 1);
            }
            throw new Error("模型请求失败: " + res.statusCode + " " + errBody);
        }

        const json = res.body.json();
        let rawText = "";

        // 根据格式解析响应
        if (format === "anthropic" && json.content && json.content[0]) {
            rawText = json.content[0].text || "";
        } else if (json.choices && json.choices[0] && json.choices[0].message) {
            rawText = json.choices[0].message.content || "";
        } else if (json.content) {
            rawText = json.content;
        } else if (json.text) {
            rawText = json.text;
        }

        // 清理 markdown 代码块 —— 优先提取 ```json ... ``` 或 ``` ... ``` 中的内容
        const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            rawText = codeBlockMatch[1].trim();
        }

        // 如果模型在 JSON 前后输出了解释文字，尝试提取最外层的大括号内容
        if (!rawText.startsWith("{")) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                rawText = jsonMatch[0];
            }
        }

        try {
            const cmd = JSON.parse(rawText);
            log("🤖 模型指令:", JSON.stringify(cmd));
            return cmd;
        } catch (e) {
            log("⚠️ 模型返回非 JSON:", rawText);
            if (retry < MAX_RETRY) {
                log(`⚠️ JSON 解析失败，${retry + 1}/${MAX_RETRY + 1} 次重试...`);
                sleep(1000);
                return callModel(instruction, screenContext, retry + 1);
            }
            return { action: "wait", delay_ms: 2000, reason: "模型输出解析失败，等待后重试" };
        }
    }

    return {
        callModel: callModel,
        setApiKey: function (key) {
            if (!CONFIG.kimi) CONFIG.kimi = {};
            CONFIG.kimi.apiKey = key;
        },
        setProvider: function (p) {
            CONFIG.provider = p;
        },
        getProvider: getProvider,
    };
})();

module.exports = ModelClient;
