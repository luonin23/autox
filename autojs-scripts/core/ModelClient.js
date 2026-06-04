/**
 * ModelClient — 大模型客户端（v2 架构）
 *
 * v2 变更：
 * - 不再要求模型返回 JSON 操作指令
 * - 要求模型返回结构化响应：script / question / text
 * - SYSTEM_PROMPT 包含完整的框架 API 文档、应用知识、编码规范
 *
 * 输出格式（模型必须遵守）：
 * {
 *   "type": "script",
 *   "code": "完整的 AutoX.js 脚本代码...",
 *   "description": "脚本功能简述",
 *   "steps": ["步骤1", "步骤2"]
 * }
 * 或
 * {
 *   "type": "question",
 *   "question": "需要向用户确认的问题"
 * }
 * 或
 * {
 *   "type": "text",
 *   "text": "纯文本回复"
 * }
 */

var ModelClient = (function () {
    // ===================== 配置加载 =====================
    var CONFIG = null;
    try {
        CONFIG = require("../config.js");
    } catch (e) {
        log("⚠️ 未找到 config.js，使用默认配置");
        CONFIG = {
            provider: "kimi",
            format: "anthropic",
            kimi: {
                baseUrl: "https://api.kimi.com/coding",
                apiKey: "",
                model: "kimi-for-coding",
            },
            deepseek: {
                baseUrl: "https://api.deepseek.com/v1",
                apiKey: "",
                model: "deepseek-chat",
            },
            local: {
                baseUrl: "http://127.0.0.1:8080/v1",
                apiKey: "",
                model: "local",
            },
            maxSteps: 15,
        };
    }
    // ===================================================

    var SYSTEM_PROMPT = buildSystemPrompt();

    function buildSystemPrompt() {
        return (
            "你是 Fold7 Agent — 专业的 AutoX.js 脚本生成专家。\n" +
            "你的唯一任务是将用户的自然语言指令转化为可直接在 AutoX.js 环境中执行的完整 JavaScript 脚本。\n\n" +

            "# ========== 你必须严格遵守的输出格式 ==========\n\n" +
            "你只能输出一个 JSON 对象（不要包裹 markdown 代码块标记）。\n\n" +
            "## 类型 1：生成脚本\n" +
            '{\n  "type": "script",\n  "code": "完整的 AutoX.js 脚本代码字符串（必须可被 engines.execScript 直接执行）",\n  "description": "一句话描述脚本功能",\n  "steps": ["步骤1简述", "步骤2简述"]\n}\n\n' +
            "## 类型 2：需要用户澄清\n" +
            '{\n  "type": "question",\n  "question": "向用户提出的问题，例如：请问您要找的肖波是微信联系人还是企业微信联系人？"\n}\n\n' +
            "## 类型 3：纯文本回复\n" +
            '{\n  "type": "text",\n  "text": "回复内容"\n}\n\n' +

            "# ========== 框架 API 文档（你必须熟悉） ==========\n\n" +
            "项目根目录: /sdcard/AutoX/fold7-agent/autojs-scripts/\n\n" +

            "## UIAutomator.js — 无障碍操作封装\n" +
            "require 路径: './core/UIAutomator.js'\n" +
            "所有脚本必须调用此模块执行操作，不要直接使用 AutoX.js 原生 API（如 click()、text().findOne() 等），除非 UIAutomator 未封装。\n\n" +
            "主要方法：\n" +
            "- UIAutomator.executeCommand(cmd): 执行单条指令\n" +
            "  cmd 格式: { action, target, text, delay_ms, reason }\n" +
            "  action 可选值: 'launch'|'click'|'longclick'|'input'|'swipe'|'back'|'home'|'wait'|'done'\n" +
            "  示例: UIAutomator.executeCommand({ action: 'launch', target: '微信', delay_ms: 3000, reason: '打开微信' })\n" +
            "- UIAutomator.safeClick(target, timeout=5000): 安全点击节点\n" +
            "- UIAutomator.safeInput(target, content): 在输入框输入文字\n" +
            "- UIAutomator.getScreenContext(maxChars=2000): 获取当前屏幕文字摘要\n" +
            "- UIAutomator.captureDebug(filename): 截图保存到 /sdcard/fold7-agent/\n" +
            "- UIAutomator.humanDelay(min=500, max=2000): 随机延迟防检测\n" +
            "- UIAutomator.bezierSwipe(x1,y1,x2,y2,duration,controlOffset): 贝塞尔曲线滑动\n\n" +

            "## StopHelper.js — 停止控制\n" +
            "require 路径: './core/StopHelper.js'\n" +
            "- StopHelper.setup(): 注册音量上键监听\n" +
            "- StopHelper.teardown(): 移除监听\n" +
            "- StopHelper.check(): 返回是否已触发停止\n" +
            "- StopHelper.safeSleep(ms): 分段睡眠，可在睡眠中被停止\n" +
            "- StopHelper.showHint(): 显示提示\n\n" +

            "## Logger.js — 日志记录\n" +
            "require 路径: './core/Logger.js'\n" +
            "- Logger.taskStart(type, instruction, params): 记录任务开始\n" +
            "- Logger.taskEnd(type, success, message, steps): 记录任务结束\n" +
            "- Logger.stepLog(stepIndex, action, target, result): 记录单步\n" +
            "- Logger.errorLog(error, screenshot): 记录错误\n\n" +

            "# ========== 应用操作知识库（你必须掌握） ==========\n\n" +

            "## 微信\n" +
            "- 打开: launchApp('微信') 后等待 3-5 秒\n" +
            "- 发消息给联系人（已知名字）:\n" +
            "  1. launchApp('微信') + wait 3s\n" +
            "  2. click '通讯录' + wait 2s\n" +
            "  3. click '搜索' 或 safeInput 搜索框输入名字 + wait 1s\n" +
            "  4. click 搜索结果中的联系人 + wait 2s\n" +
            "  5. click '发消息'（如未直接进入聊天）+ wait 1s\n" +
            "  6. safeInput 输入框（提示文字通常是空的，可用 className EditText 定位）\n" +
            "  7. click '发送'\n" +
            "- 微信首页底部标签: 微信 / 通讯录 / 发现 / 我\n" +
            "- 搜索框通常在顶部，有放大镜图标\n\n" +

            "## 钉钉\n" +
            "- 打开: launchApp('钉钉') 后等待 3-5 秒\n" +
            "- 打卡路径: 工作台 → 考勤打卡 → 点击打卡按钮\n" +
            "- 底部标签: 消息 / 文档 / 工作台 / 通讯录 / 我的\n" +
            "- 工作台在底部第 3 个标签\n\n" +

            "## 飞书\n" +
            "- 打开: launchApp('飞书') 后等待 3-5 秒\n" +
            "- 底部标签: 消息 / 日历 / 云文档 / 工作台 / 通讯录\n" +
            "- 打卡通常在 工作台 内\n\n" +

            "## 支付宝\n" +
            "- 打开: launchApp('支付宝')\n" +
            "- 付款码: 首页点击 '付钱'\n" +
            "- 扫一扫: 首页点击 '扫一扫'\n" +
            "- 蚂蚁森林: 搜索 '蚂蚁森林' → 进入\n\n" +

            "## 淘宝\n" +
            "- 打开: launchApp('淘宝')\n" +
            "- 搜索: 首页顶部搜索框 → 输入关键词 → 点击搜索\n\n" +

            "## 设置\n" +
            "- 打开: launchApp('设置')\n" +
            "- 常见页面: WLAN / 蓝牙 / 显示 / 声音 / 应用管理\n\n" +

            "## 高德地图 / 百度地图\n" +
            "- 打开: launchApp('高德地图') 或 launchApp('百度地图')\n" +
            "- 导航: 搜索目的地 → 选择结果 → 路线 / 导航\n\n" +

            "# ========== Rhino JavaScript 兼容性规范（必须遵守） ==========\n\n" +
            "AutoX.js 使用 Rhino 引擎，不是 V8/Node.js，有以下严格限制：\n" +
            "1. 同一函数作用域内，const/let 不能重复声明同名变量（包括 switch case 之间）\n" +
            "2. 优先使用 var 声明变量，避免 const/let 的兼容问题\n" +
            "3. 不要使用箭头函数 () => {}，使用传统 function() {}\n" +
            "4. 不要使用模板字符串 `${var}`，使用字符串拼接 '+'\n" +
            "5. 不要使用解构赋值 const {a, b} = obj\n" +
            "6. 不要使用 Promise/async/await，所有逻辑必须同步或使用回调\n" +
            "7. 不要使用 Class 语法，使用传统函数 + prototype\n" +
            "8. 不要使用 Array.prototype.includes（Rhino 可能不支持），使用 indexOf >= 0\n" +
            "9. JSON.parse 和 JSON.stringify 可用\n" +
            "10. 脚本顶部必须加 \"ui\"; 声明（如果用到 ui 模块），否则不需要\n\n" +

            "# ========== 脚本编写规范 ==========\n\n" +
            "1. 生成的脚本必须是完整的、可直接执行的代码\n" +
            "2. 脚本结构模板：\n" +
            "   (function() {\n" +
            "       var UIAutomator = require('./core/UIAutomator.js');\n" +
            "       var StopHelper = require('./core/StopHelper.js');\n" +
            "       var Logger = require('./core/Logger.js');\n" +
            "       StopHelper.setup();\n" +
            "       Logger.taskStart('script', '指令描述', null);\n" +
            "       try {\n" +
            "           // ... 执行步骤 ...\n" +
            "           Logger.taskEnd('script', true, '完成', 步数);\n" +
            "       } catch (e) {\n" +
            "           Logger.errorLog(e.message, null);\n" +
            "           log('❌ 脚本执行出错: ' + e.message);\n" +
            "       } finally {\n" +
            "           StopHelper.teardown();\n" +
            "       }\n" +
            "   })();\n" +
            "3. 每个 executeCommand 后必须跟适当的 delay_ms（微信操作 >= 3000ms，其他 >= 1000ms）\n" +
            "4. 关键步骤前检查 StopHelper.check()，如果为 true 则停止\n" +
            "5. 操作失败后不要直接 throw，应记录错误并尝试优雅退出\n" +
            "6. 输入内容如包含特殊字符，确保正确转义\n\n" +

            "# ========== 错误处理策略 ==========\n\n" +
            "1. 遇到弹窗（确定/允许/关闭/暂不）：优先处理弹窗再继续原任务\n" +
            "2. 节点查找失败：尝试 textContains / desc / className 回退查找\n" +
            "3. 页面加载慢：增加 delay_ms 或使用 wait 步骤\n" +
            "4. 网络超时：重试一次，仍然失败则退出\n\n" +

            "# ========== 你的决策逻辑 ==========\n\n" +
            "1. 如果用户指令清晰且你完全了解该应用的操作流程 → 直接输出 type=script\n" +
            "2. 如果用户指令涉及你不确定的应用版本或操作路径 → 输出 type=question 询问用户\n" +
            "3. 如果用户只是闲聊或询问功能 → 输出 type=text\n" +
            "4. 永远不要猜测不确定的 UI 元素文字，如果不确定就提问\n"
        );
    }

    function getCfg() {
        var provider = CONFIG.provider || "kimi";
        return CONFIG[provider] || CONFIG.kimi;
    }

    function getProvider() {
        return CONFIG.provider || "kimi";
    }

    function validateConfig() {
        if (typeof global !== "undefined" && global._MOCK_SKIP_VALIDATION) {
            return true;
        }
        var provider = getProvider();
        var cfg = getCfg();
        if ((provider === "kimi" || provider === "deepseek") && (!cfg.apiKey || cfg.apiKey.length < 10)) {
            throw new Error(provider + " API Key 未配置。请编辑 config.js 填入 apiKey");
        }
        return true;
    }

    /**
     * 调用模型（基础版）
     */
    function callModel(instruction, screenContext, retry) {
        retry = retry || 0;
        var MAX_RETRY = 2;
        validateConfig();

        var cfg = getCfg();
        var format = CONFIG.format || "openai";
        var userContent = screenContext
            ? "用户指令：" + instruction + "\n当前屏幕内容：" + screenContext
            : "用户指令：" + instruction;

        var payload, headers, apiUrl;
        var baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");

        if (format === "anthropic") {
            apiUrl = baseUrl + "/messages";
            headers = {
                "Content-Type": "application/json",
                "x-api-key": cfg.apiKey,
                "anthropic-version": "2023-06-01",
            };
            payload = {
                model: cfg.model,
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                messages: [{ role: "user", content: userContent }],
            };
        } else {
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
                temperature: 0.2,
                max_tokens: 4096,
            };
        }

        toastLog("🧠 正在思考...");
        var res = http.postJson(apiUrl, payload, {
            headers: headers,
            timeout: 60000,
        });

        if (res.statusCode !== 200) {
            var errBody = res.body ? res.body.string() : "";
            if (retry < MAX_RETRY) {
                log("⚠️ 模型请求失败 (" + res.statusCode + ")，" + (retry + 1) + "/" + (MAX_RETRY + 1) + " 次重试...");
                sleep(1000 * (retry + 1));
                return callModel(instruction, screenContext, retry + 1);
            }
            throw new Error("模型请求失败: " + res.statusCode + " " + errBody);
        }

        var json = res.body.json();
        var rawText = "";

        if (format === "anthropic" && json.content && json.content[0]) {
            rawText = json.content[0].text || "";
        } else if (json.choices && json.choices[0] && json.choices[0].message) {
            rawText = json.choices[0].message.content || "";
        } else if (json.content) {
            rawText = json.content;
        } else if (json.text) {
            rawText = json.text;
        }

        return rawText;
    }

    /**
     * 调用模型（支持对话历史）
     * @param {array} messages 完整消息历史 [{role, content}, ...]
     */
    function callModelWithHistory(messages, retry) {
        retry = retry || 0;
        var MAX_RETRY = 2;
        validateConfig();

        var cfg = getCfg();
        var format = CONFIG.format || "openai";
        var baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");
        var payload, headers, apiUrl;

        if (format === "anthropic") {
            apiUrl = baseUrl + "/messages";
            headers = {
                "Content-Type": "application/json",
                "x-api-key": cfg.apiKey,
                "anthropic-version": "2023-06-01",
            };
            // Anthropic 格式：system 放在顶层，messages 不含 system
            var systemMsg = SYSTEM_PROMPT;
            var userMessages = messages.filter(function (m) {
                return m.role !== "system";
            });
            payload = {
                model: cfg.model,
                max_tokens: 4096,
                system: systemMsg,
                messages: userMessages,
            };
        } else {
            apiUrl = baseUrl + "/chat/completions";
            headers = {
                "Content-Type": "application/json",
            };
            if (cfg.apiKey) {
                headers["Authorization"] = "Bearer " + cfg.apiKey;
            }
            // OpenAI 格式：system 作为第一条 message
            var fullMessages = [{ role: "system", content: SYSTEM_PROMPT }].concat(
                messages.filter(function (m) {
                    return m.role !== "system";
                })
            );
            payload = {
                model: cfg.model,
                messages: fullMessages,
                temperature: 0.2,
                max_tokens: 4096,
            };
        }

        toastLog("🧠 正在思考...");
        var res = http.postJson(apiUrl, payload, {
            headers: headers,
            timeout: 60000,
        });

        if (res.statusCode !== 200) {
            var errBody = res.body ? res.body.string() : "";
            if (retry < MAX_RETRY) {
                log("⚠️ 模型请求失败 (" + res.statusCode + ")，" + (retry + 1) + "/" + (MAX_RETRY + 1) + " 次重试...");
                sleep(1000 * (retry + 1));
                return callModelWithHistory(messages, retry + 1);
            }
            throw new Error("模型请求失败: " + res.statusCode + " " + errBody);
        }

        var json = res.body.json();
        var rawText = "";

        if (format === "anthropic" && json.content && json.content[0]) {
            rawText = json.content[0].text || "";
        } else if (json.choices && json.choices[0] && json.choices[0].message) {
            rawText = json.choices[0].message.content || "";
        } else if (json.content) {
            rawText = json.content;
        } else if (json.text) {
            rawText = json.text;
        }

        return rawText;
    }

    return {
        callModel: callModel,
        callModelWithHistory: callModelWithHistory,
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
