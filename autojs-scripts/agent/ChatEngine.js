/**
 * ChatEngine — 对话引擎
 *
 * 管理完整的 AI 意图确认 → 脚本生成 → 执行 → 调试 → 修复闭环：
 *   1. 接收用户自然语言指令
 *   2. 先让模型拆解并确认用户意图
 *   3. 用户确认后调用 ModelClient 生成 AutoX.js 脚本
 *   4. 通过 ScriptExecutor 执行脚本
 *   5. 监控日志，捕获错误
 *   6. 出错时自动调用 AI 修复（带错误日志 + 屏幕截图）
 *   7. 重试直到成功或达到最大修复次数
 *
 * 用法：
 *   var ChatEngine = require("./agent/ChatEngine.js");
 *   var engine = ChatEngine.create({
 *       onMessage: function(msg) { ... },      // AI 回复文本
 *       onScript: function(script, desc) { ... }, // 生成脚本，展示给用户
 *       onLog: function(line) { ... },         // 执行日志
 *       onStatus: function(status) { ... },    // 状态变化
 *       onComplete: function(report) { ... },  // 执行完成报告
 *   });
 *   engine.send("从微信找到肖波，发一句你好");
 */

var ChatEngine = (function () {
    var ModelClient = require("../core/ModelClient.js");
    var ScriptExecutor = require("./ScriptExecutor.js");
    var Logger = require("../core/Logger.js");
    var UIAutomator = require("../core/UIAutomator.js");

    // 最大自动修复次数
    var MAX_FIX_RETRIES = 3;
    // 脚本执行超时（毫秒）
    var EXEC_TIMEOUT = 90000;

    function createEngine(handlers) {
        handlers = handlers || {};
        var onMessage = handlers.onMessage || function () {};
        var onScript = handlers.onScript || function () {};
        var onLog = handlers.onLog || function () {};
        var onStatus = handlers.onStatus || function () {};
        var onComplete = handlers.onComplete || function () {};

        // 当前对话上下文
        var conversation = [];
        var currentExecutor = null;
        var isRunning = false;
        var pendingConfirmation = null;

        /**
         * 添加系统消息到对话历史
         */
        function addSystem(msg) {
            conversation.push({ role: "system", content: msg });
        }

        /**
         * 添加用户消息到对话历史
         */
        function addUser(msg) {
            conversation.push({ role: "user", content: msg });
        }

        /**
         * 添加助手消息到对话历史
         */
        function addAssistant(msg) {
            conversation.push({ role: "assistant", content: msg });
        }

        /**
         * 调用 AI 进行意图确认、生成脚本或修复脚本
         * @param {string} phase "confirm" | "generate" | "fix"
         * @param {object} extra 额外上下文
         */
        function callAI(phase, extra) {
            extra = extra || {};
            var instruction = extra.instruction || "";
            var error = extra.error || "";
            var logs = extra.logs || [];
            var screen = extra.screen || "";

            var userContent;
            if (phase === "confirm") {
                userContent =
                    "用户原话：" + instruction + "\n\n" +
                    "请只做意图理解和动作拆解，不要生成脚本，不要输出代码，不要执行。\n" +
                    "请用 JSON 返回：\n" +
                    "{\n" +
                    '  "type": "confirmation",\n' +
                    '  "original": "用户原话",\n' +
                    '  "understanding": "你理解用户想完成什么",\n' +
                    '  "steps": ["第1步", "第2步"],\n' +
                    '  "question": "请确认我的理解是否正确。如果正确，请回复：正确；如果错误，请直接纠正。"\n' +
                    "}";
            } else if (phase === "generate") {
                userContent = "用户指令：" + instruction + "\n\n请生成 AutoX.js 脚本。";
            } else if (phase === "fix") {
                var logLines = [];
                for (var li = 0; li < logs.length; li++) {
                    logLines.push(logs[li].message || "");
                }
                var logText = logLines.join("\n");
                userContent =
                    "之前生成的脚本执行出错了，请修复。\n\n" +
                    "原始指令：" + instruction + "\n\n" +
                    "错误信息：" + error + "\n\n" +
                    "执行日志：\n" + logText + "\n\n" +
                    "当前屏幕内容：" + screen + "\n\n" +
                    "请分析错误原因并输出修复后的完整脚本。";
            } else {
                userContent = instruction;
            }

            // 将对话历史传给模型（如果有）
            var messages = conversation.slice();
            // 最后追加当前请求
            messages.push({ role: "user", content: userContent });

            return ModelClient.callModelWithHistory(messages);
        }

        /**
         * 解析 AI 返回的响应
         * 期望格式为 JSON：{ "type": "script" | "question" | "text", ... }
         */
        function parseResponse(rawText) {
            // 先尝试提取 JSON 块
            var text = rawText || "";
            var codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                text = codeBlockMatch[1].trim();
            }
            // 尝试找最外层的大括号
            if (text.charAt(0) !== "{") {
                var jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    text = jsonMatch[0];
                }
            }
            try {
                return JSON.parse(text);
            } catch (e) {
                // 如果无法解析为 JSON，视为纯文本或脚本代码
                // 检测是否是完整的 AutoX.js 脚本（包含 "ui"; 或 function）
                if (text.indexOf('"ui";') >= 0 || text.indexOf("function") >= 0) {
                    return {
                        type: "script",
                        code: rawText,
                        description: "AI 返回的脚本（非 JSON 格式）",
                    };
                }
                return {
                    type: "text",
                    text: rawText,
                };
            }
        }

        function isConfirmationAnswer(text) {
            var value = String(text || "").trim().toLowerCase();
            var confirmations = ["正确", "确认", "是的", "对", "没错", "可以", "开始", "执行", "ok", "yes", "y"];
            for (var i = 0; i < confirmations.length; i++) {
                if (value === confirmations[i]) return true;
            }
            return value.indexOf("正确") >= 0 ||
                value.indexOf("确认") >= 0 ||
                value.indexOf("没错") >= 0 ||
                value.indexOf("可以开始") >= 0 ||
                value.indexOf("ok") >= 0 ||
                value.indexOf("yes") >= 0;
        }

        function formatConfirmation(parsed, rawText, instruction) {
            if (parsed && parsed.type === "confirmation") {
                var lines = [];
                lines.push("我收到的用户请求原话是：");
                lines.push(parsed.original || instruction);
                lines.push("");
                lines.push("经过分析，我理解你希望我：");
                var steps = parsed.steps || [];
                for (var i = 0; i < steps.length; i++) {
                    lines.push((i + 1) + ". " + steps[i]);
                }
                if (steps.length === 0 && parsed.understanding) {
                    lines.push("1. " + parsed.understanding);
                }
                lines.push("");
                lines.push(parsed.question || "请确认我的理解是否正确。如果正确，请回复：正确；如果错误，请直接纠正。");
                return lines.join("\n");
            }
            return rawText || "请确认我的理解是否正确。如果正确，请回复：正确；如果错误，请直接纠正。";
        }

        /**
         * 获取当前屏幕上下文（用于修复时）
         */
        function getScreenContext() {
            try {
                return UIAutomator.getScreenContext(2000);
            } catch (e) {
                return "（无法获取屏幕内容）";
            }
        }

        /**
         * 执行脚本并监控（带自动修复）
         */
        function runWithAutoFix(scriptCode, instruction, fixCount) {
            fixCount = fixCount || 0;
            isRunning = true;
            onStatus(fixCount === 0 ? "执行中..." : "修复后重试 (" + fixCount + "/" + MAX_FIX_RETRIES + ")...");

            Logger.taskStart("agent", instruction, { fixCount: fixCount });

            currentExecutor = ScriptExecutor.execute(scriptCode, {
                timeout: EXEC_TIMEOUT,
                onLog: function (line) {
                    onLog(line);
                },
                onComplete: function (report) {
                    isRunning = false;
                    currentExecutor = null;

                    if (report.success) {
                        onStatus("执行成功");
                        Logger.taskEnd("agent", true, "任务完成", report.logs.length);
                        onComplete(report);
                    } else if (fixCount < MAX_FIX_RETRIES) {
                        // 自动修复
                        onStatus("执行失败，正在分析并修复...");
                        var screen = getScreenContext();
                        var errorInfo = report.error || "未知错误";

                        // 记录错误
                        Logger.errorLog(errorInfo, report.screenshot);

                        // 调用 AI 修复
                        threads.start(function () {
                            try {
                                var fixResponse = callAI("fix", {
                                    instruction: instruction,
                                    error: errorInfo,
                                    logs: report.logs,
                                    screen: screen,
                                });
                                var parsed = parseResponse(fixResponse);

                                if (parsed.type === "script" && parsed.code) {
                                    onMessage("已生成修复版脚本，正在重新执行...");
                                    onScript(parsed.code, parsed.description || "修复版脚本");
                                    runWithAutoFix(parsed.code, instruction, fixCount + 1);
                                } else {
                                    onMessage("无法自动修复：" + (parsed.text || "AI 未返回脚本"));
                                    onStatus("修复失败");
                                    Logger.taskEnd("agent", false, "修复失败", report.logs.length);
                                    onComplete(report);
                                }
                            } catch (e) {
                                onMessage("修复过程出错：" + e.message);
                                onStatus("修复失败");
                                Logger.taskEnd("agent", false, "修复过程出错", report.logs.length);
                                onComplete(report);
                            }
                        });
                    } else {
                        onStatus("已达到最大修复次数，执行失败");
                        Logger.taskEnd("agent", false, "达到最大修复次数", report.logs.length);
                        onComplete(report);
                    }
                },
            });
        }

        function requestConfirmation(instruction, isCorrection) {
            pendingConfirmation = {
                instruction: instruction,
            };
            onStatus("等待确认");
            onMessage(isCorrection ? "正在根据您的纠正重新拆解任务..." : "正在理解您的指令并拆解动作...");

            threads.start(function () {
                try {
                    var rawResponse = callAI("confirm", { instruction: instruction });
                    addAssistant(rawResponse);
                    var parsed = parseResponse(rawResponse);
                    onMessage(formatConfirmation(parsed, rawResponse, instruction));
                    onStatus("等待用户确认");
                } catch (e) {
                    onMessage("调用 AI 失败：" + e.message);
                    onStatus("AI 调用失败");
                    pendingConfirmation = null;
                }
            });
        }

        function generateAndExecute(instruction) {
            onStatus("AI 正在生成脚本...");
            onMessage("已确认任务，正在生成脚本...");

            threads.start(function () {
                try {
                    var rawResponse = callAI("generate", { instruction: instruction });
                    addAssistant(rawResponse);

                    var parsed = parseResponse(rawResponse);

                    if (parsed.type === "question") {
                        onMessage(parsed.question || "需要更多信息");
                        onStatus("等待用户回答");
                        return;
                    }

                    if (parsed.type === "text") {
                        onMessage(parsed.text || rawResponse);
                        onStatus("就绪");
                        return;
                    }

                    if (parsed.type === "script" && parsed.code) {
                        onMessage("脚本已生成，准备执行...");
                        onScript(parsed.code, parsed.description || "生成的脚本");
                        runWithAutoFix(parsed.code, instruction, 0);
                    } else {
                        onMessage("AI 返回格式不正确，请重试\n原始返回:\n" + rawResponse.substring(0, 500));
                        onStatus("生成失败");
                    }
                } catch (e) {
                    onMessage("调用 AI 失败：" + e.message);
                    onStatus("AI 调用失败");
                }
            });
        }

        return {
            /**
             * 发送用户指令。首次发送只确认意图；用户确认后才生成、执行和调试。
             */
            send: function (instruction) {
                if (isRunning) {
                    onMessage("当前有任务正在执行，请等待完成或停止当前任务");
                    return;
                }

                addUser(instruction);

                if (pendingConfirmation) {
                    if (isConfirmationAnswer(instruction)) {
                        var confirmedInstruction = pendingConfirmation.instruction;
                        pendingConfirmation = null;
                        generateAndExecute(confirmedInstruction);
                    } else {
                        var revisedInstruction =
                            "原始需求：" + pendingConfirmation.instruction + "\n" +
                            "用户纠正：" + instruction;
                        requestConfirmation(revisedInstruction, true);
                    }
                    return;
                }

                requestConfirmation(instruction, false);
            },

            /**
             * Execute an existing script through the same monitored runtime.
             * This is used by script cards and the Manage tab; model generation
             * remains in the app framework, not inside generated scripts.
             */
            execute: function (scriptCode, instruction) {
                if (isRunning) {
                    onMessage("当前有任务正在执行，请等待完成或停止当前任务");
                    return;
                }
                onMessage("正在执行脚本: " + (instruction || "手动执行"));
                runWithAutoFix(scriptCode, instruction || "手动执行", 0);
            },

            /**
             * 停止当前执行
             */
            stop: function () {
                if (currentExecutor) {
                    currentExecutor.stop();
                    currentExecutor = null;
                }
                pendingConfirmation = null;
                isRunning = false;
                onStatus("已停止");
            },

            /**
             * 回答 AI 的问题（当 AI 返回 question 类型时）
             */
            answer: function (answer) {
                this.send(answer);
            },

            /**
             * 是否正在运行
             */
            isRunning: function () {
                return isRunning;
            },
        };
    }

    return {
        create: createEngine,
    };
})();

module.exports = ChatEngine;
