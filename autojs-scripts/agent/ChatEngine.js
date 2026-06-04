/**
 * ChatEngine — 对话引擎
 *
 * 管理完整的 AI 脚本生成 → 执行 → 调试 → 修复闭环：
 *   1. 接收用户自然语言指令
 *   2. 调用 ModelClient 生成 AutoX.js 脚本
 *   3. 通过 ScriptExecutor 执行脚本
 *   4. 监控日志，捕获错误
 *   5. 出错时自动调用 AI 修复（带错误日志 + 屏幕截图）
 *   6. 重试直到成功或达到最大修复次数
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
         * 调用 AI 生成脚本（或提问）
         * @param {string} phase "generate" | "fix"
         * @param {object} extra 额外上下文
         */
        function callAI(phase, extra) {
            extra = extra || {};
            var instruction = extra.instruction || "";
            var error = extra.error || "";
            var logs = extra.logs || [];
            var screen = extra.screen || "";

            var userContent;
            if (phase === "generate") {
                userContent = "用户指令：" + instruction + "\n\n请生成 AutoX.js 脚本。";
            } else if (phase === "fix") {
                var logText = logs.map(function (l) {
                    return l.message;
                }).join("\n");
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
            if (!text.startsWith("{")) {
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
                        onStatus("✅ 执行成功");
                        Logger.taskEnd("agent", true, "任务完成", report.logs.length);
                        onComplete(report);
                    } else if (fixCount < MAX_FIX_RETRIES) {
                        // 自动修复
                        onStatus("❌ 执行失败，正在分析并修复...");
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
                                    onMessage("🔄 已生成修复版脚本，正在重新执行...");
                                    onScript(parsed.code, parsed.description || "修复版脚本");
                                    runWithAutoFix(parsed.code, instruction, fixCount + 1);
                                } else {
                                    onMessage("❌ 无法自动修复：" + (parsed.text || "AI 未返回脚本"));
                                    onStatus("修复失败");
                                    Logger.taskEnd("agent", false, "修复失败", report.logs.length);
                                    onComplete(report);
                                }
                            } catch (e) {
                                onMessage("❌ 修复过程出错：" + e.message);
                                onStatus("修复失败");
                                Logger.taskEnd("agent", false, "修复过程出错", report.logs.length);
                                onComplete(report);
                            }
                        });
                    } else {
                        onStatus("❌ 已达到最大修复次数，执行失败");
                        Logger.taskEnd("agent", false, "达到最大修复次数", report.logs.length);
                        onComplete(report);
                    }
                },
            });
        }

        return {
            /**
             * 发送用户指令，启动生成-执行-调试闭环
             */
            send: function (instruction) {
                if (isRunning) {
                    onMessage("⚠️ 当前有任务正在执行，请等待完成或停止当前任务");
                    return;
                }

                addUser(instruction);
                onStatus("🧠 AI 正在生成脚本...");
                onMessage("🧠 正在理解您的指令并生成脚本...");

                threads.start(function () {
                    try {
                        var rawResponse = callAI("generate", { instruction: instruction });
                        addAssistant(rawResponse);

                        var parsed = parseResponse(rawResponse);

                        if (parsed.type === "question") {
                            onMessage("❓ " + (parsed.question || "需要更多信息"));
                            onStatus("等待用户回答");
                            return;
                        }

                        if (parsed.type === "text") {
                            onMessage(parsed.text || rawResponse);
                            onStatus("就绪");
                            return;
                        }

                        if (parsed.type === "script" && parsed.code) {
                            onMessage("✅ 脚本已生成，准备执行...");
                            onScript(parsed.code, parsed.description || "生成的脚本");
                            runWithAutoFix(parsed.code, instruction, 0);
                        } else {
                            onMessage("⚠️ AI 返回格式不正确，请重试\n原始返回:\n" + rawResponse.substring(0, 500));
                            onStatus("生成失败");
                        }
                    } catch (e) {
                        onMessage("❌ 调用 AI 失败：" + e.message);
                        onStatus("AI 调用失败");
                    }
                });
            },

            /**
             * 手动执行一段脚本（用户点击"执行"按钮时使用）
             */
            execute: function (scriptCode, description) {
                if (isRunning) {
                    onMessage("⚠️ 当前有任务正在执行");
                    return;
                }
                onScript(scriptCode, description || "用户手动执行");
                runWithAutoFix(scriptCode, description || "手动执行", 0);
            },

            /**
             * 停止当前执行
             */
            stop: function () {
                if (currentExecutor) {
                    currentExecutor.stop();
                    currentExecutor = null;
                }
                isRunning = false;
                onStatus("已停止");
            },

            /**
             * 回答 AI 的问题（当 AI 返回 question 类型时）
             */
            answer: function (answer) {
                addUser(answer);
                onStatus("🧠 AI 正在重新生成...");
                onMessage("🧠 根据您的回答重新生成脚本...");

                threads.start(function () {
                    try {
                        var rawResponse = callAI("generate", { instruction: answer });
                        addAssistant(rawResponse);
                        var parsed = parseResponse(rawResponse);

                        if (parsed.type === "script" && parsed.code) {
                            onScript(parsed.code, parsed.description || "生成的脚本");
                            runWithAutoFix(parsed.code, answer, 0);
                        } else if (parsed.type === "question") {
                            onMessage("❓ " + (parsed.question || "需要更多信息"));
                        } else {
                            onMessage(parsed.text || rawResponse);
                        }
                    } catch (e) {
                        onMessage("❌ 调用 AI 失败：" + e.message);
                    }
                });
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
