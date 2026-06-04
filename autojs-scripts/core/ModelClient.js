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
            kimi: { apiKey: "", model: "kimi-k2-6", url: "https://api.moonshot.cn/v1/chat/completions" },
            deepseek: { apiKey: "", model: "deepseek-chat", url: "https://api.deepseek.com/v1/chat/completions" },
            local: { apiKey: "", model: "local", url: "http://127.0.0.1:8080/v1/chat/completions" },
        };
    }
    // ===================================================

    const SYSTEM_PROMPT = `你是一个手机自动化助手。你只能输出 JSON 格式的操作指令，不要输出任何其他文字。

## 任务分解
当用户指令需要多步完成时，请输出一个 steps 数组，每个元素是一个操作指令对象。

## 可用 action 类型
- "launch": 打开应用，target 为应用名称
- "click": 点击屏幕上文字/描述为 target 的节点
- "input": 在输入框中输入文字，target 为输入框描述，text 为输入内容
- "swipe": 滑动屏幕，target 为方向 "up|down|left|right"
- "back": 返回上一级
- "home": 回到桌面
- "wait": 等待，delay_ms 后执行下一步
- "done": 任务完成

## 单步输出格式（严格 JSON，不要 markdown 代码块）
{
  "action": "launch|click|input|swipe|back|home|wait|done",
  "target": "目标文字或描述",
  "text": "输入内容（仅 input 时用）",
  "delay_ms": 1500,
  "reason": "简短说明为什么执行这一步"
}

## 多步输出格式（严格 JSON，不要 markdown 代码块）
{
  "steps": [
    { "action": "launch", "target": "微信", "delay_ms": 3000, "reason": "打开微信" },
    { "action": "click", "target": "搜索", "delay_ms": 1500, "reason": "点击搜索框" },
    { "action": "done", "reason": "任务完成" }
  ]
}

## 错误恢复建议
如果当前屏幕出现错误弹窗、网络超时、权限请求等异常情况，请优先处理异常后再继续原任务：
- 弹窗：点击"确定"、"允许"或"关闭"
- 网络超时：点击"重试"
- 权限请求：点击"允许"或"去设置"

## 输出语言
所有 reason 字段请使用中文。`;

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
        const userContent = screenContext
            ? `用户指令：${instruction}\n当前屏幕内容：${screenContext}`
            : `用户指令：${instruction}`;

        // 统一使用 OpenAI 兼容格式（Kimi、DeepSeek 和 llama.cpp server 都支持）
        const payload = {
            model: cfg.model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userContent },
            ],
            temperature: 0.3,
            max_tokens: 256,
        };

        const headers = {
            "Content-Type": "application/json",
        };
        if (cfg.apiKey) {
            headers["Authorization"] = "Bearer " + cfg.apiKey;
        }

        toastLog("🧠 正在思考...");
        // 设置 30 秒超时，防止网络卡住导致脚本无法退出
        const res = http.postJson(cfg.url, payload, {
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

        // 统一解析 OpenAI 格式
        if (json.choices && json.choices[0] && json.choices[0].message) {
            rawText = json.choices[0].message.content || "";
        } else if (json.content) {
            rawText = json.content;
        } else if (json.text) {
            rawText = json.text;
        }

        // 清理 markdown 代码块
        rawText = rawText.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();

        // 有时模型会输出多余文字，尝试提取 JSON
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            rawText = jsonMatch[0];
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
