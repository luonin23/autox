/**
 * ScriptExecutor — AI 生成脚本的执行与监控引擎
 *
 * 职责：
 * 1. 在独立线程中执行 AI 生成的 AutoX.js 脚本
 * 2. 通过 console 事件监听实时捕获脚本日志
 * 3. 检测执行成功/失败/超时
 * 4. 返回完整的执行报告（日志、错误、截图）
 *
 * 用法：
 *   var ScriptExecutor = require("./agent/ScriptExecutor.js");
 *   ScriptExecutor.execute(scriptCode, {
 *       onLog: function(line) { ... },
 *       onComplete: function(report) { ... },
 *   });
 */

var ScriptExecutor = (function () {
    var LOG_DIR = "/sdcard/fold7-agent/logs/";
    var EXEC_LOG = LOG_DIR + "exec_";

    try {
        files.createWithDirs(LOG_DIR);
    } catch (e) {
        log("⚠️ 创建日志目录失败:", e.message);
    }

    /**
     * 生成执行报告对象
     */
    function createReport(success, logs, error, screenshot) {
        return {
            success: success,
            logs: logs || [],
            error: error || null,
            screenshot: screenshot || null,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * 执行脚本并监控
     * @param {string} scriptCode 完整的 AutoX.js 脚本代码
     * @param {object} options 配置项
     *   - timeout: 超时时间（毫秒，默认 60000）
     *   - onLog: 回调，每收到一条日志触发 function(line)
     *   - onComplete: 回调，执行结束时触发 function(report)
     * @returns {object} 控制句柄 { stop: function }
     */
    function execute(scriptCode, options) {
        options = options || {};
        var timeout = options.timeout || 60000;
        var onLog = options.onLog || function () {};
        var onComplete = options.onComplete || function () {};

        var logs = [];
        var stopped = false;
        var completed = false;
        var engineName = "fold7_gen_" + Date.now();

        // 唯一执行日志文件（供脚本内部写入，也供本模块读取）
        var execLogFile = EXEC_LOG + engineName + ".jsonl";

        // 给脚本注入执行元信息，方便脚本内部记录
        // 注意：Rhino 不支持 globalThis，使用 var 在 IIFE 内声明即可
        var wrappedCode =
            '// ===== Fold7 Agent 生成脚本 =====\n' +
            '// 执行ID: ' + engineName + '\n' +
            '// 生成时间: ' + new Date().toLocaleString() + '\n' +
            '\n' +
            '(function(__execId, __logFile) {\n' +
            '    // 执行标识（局部变量即可）\n' +
            '    var __FOLD7_EXEC_ID = __execId;\n' +
            '    var __FOLD7_LOG_FILE = __logFile;\n' +
            '\n' +
            '    // 重写 log，同时输出到文件便于监控\n' +
            '    var _origLog = log;\n' +
            '    var _customLog = function() {\n' +
            '        var args = Array.prototype.slice.call(arguments);\n' +
            '        var line = args.join(" ");\n' +
            '        _origLog.apply(null, args);\n' +
            '        try {\n' +
            '            var record = JSON.stringify({t: Date.now(), msg: line}) + "\\n";\n' +
            '            files.append(__logFile, record);\n' +
            '        } catch (e) {}\n' +
            '    };\n' +
            '    // 将自定义 log 暴露给内部脚本使用\n' +
            '    log = _customLog;\n' +
            '\n' +
            scriptCode + '\n' +
            '\n' +
            '})("' + engineName + '", "' + execLogFile + '");\n';

        // 启动执行线程
        var execThread = threads.start(function () {
            try {
                // 使用 engines.execScript 在独立引擎中运行
                engines.execScript(engineName, wrappedCode);
            } catch (e) {
                log("❌ 脚本启动失败:", e.message);
                if (!completed) {
                    completed = true;
                    onComplete(createReport(false, logs, "脚本启动失败: " + e.message));
                }
            }
        });

        // 监听该引擎的 console 输出；AutoX v7 可能没有 observeConsole，
        // 这种情况下依赖注入脚本写入的 exec_*.jsonl 文件日志。
        var consoleListener = null;
        if (events && events.observeConsole) {
            try {
                // AutoX.js 支持 events.on("console") 监听其他脚本的 console
                events.observeConsole();
                consoleListener = function (msg) {
                    if (stopped || completed) return;
                    // msg 是 ConsoleMessage 对象，有 getMessage() 等方法
                    var line = "";
                    try {
                        if (msg && msg.getMessage) {
                            line = msg.getMessage();
                        } else if (typeof msg === "string") {
                            line = msg;
                        } else {
                            line = String(msg);
                        }
                    } catch (e) {
                        line = String(msg);
                    }
                    if (line) {
                        logs.push({ time: Date.now(), level: "log", message: line });
                        onLog(line);
                    }
                };
                events.on("console", consoleListener);
            } catch (e) {}
        }

        // 超时检测线程
        var timeoutThread = threads.start(function () {
            sleep(timeout);
            if (!completed && !stopped) {
                stopped = true;
                try {
                    engines.stopEngine(engineName);
                } catch (e) {}
                completed = true;
                onComplete(createReport(false, logs, "执行超时（" + timeout / 1000 + "秒）"));
            }
        });

        // 轮询检测脚本是否仍在运行（作为超时/完成的补充检测）
        var pollThread = threads.start(function () {
            var checkInterval = 2000;
            var maxWait = timeout + 10000;
            var waited = 0;
            while (waited < maxWait && !completed && !stopped) {
                sleep(checkInterval);
                waited += checkInterval;

                // 检查引擎是否还在运行
                var stillRunning = false;
                try {
                    var all = engines.all();
                    for (var i = 0; i < all.length; i++) {
                        if (all[i].getName() === engineName) {
                            stillRunning = true;
                            break;
                        }
                    }
                } catch (e) {}

                if (!stillRunning && !completed) {
                    // 引擎已结束
                    completed = true;
                    // 判断是成功还是失败：检查日志中是否有错误
                    var hasError = false;
                    var errorMsg = null;
                    for (var j = 0; j < logs.length; j++) {
                        var msg = logs[j].message || "";
                        if (msg.indexOf("❌") >= 0 || msg.indexOf("Error") >= 0 || msg.indexOf("error") >= 0) {
                            hasError = true;
                            errorMsg = msg;
                            break;
                        }
                    }
                    onComplete(createReport(!hasError, logs, errorMsg));
                    break;
                }
            }
        });

        return {
            stop: function () {
                stopped = true;
                try {
                    engines.stopEngine(engineName);
                } catch (e) {}
                try {
                    if (consoleListener) {
                        events.removeListener("console", consoleListener);
                    }
                } catch (e) {}
                if (!completed) {
                    completed = true;
                    onComplete(createReport(false, logs, "用户手动停止"));
                }
            },
            getLogs: function () {
                return logs.slice();
            },
        };
    }

    return {
        execute: execute,
    };
})();

module.exports = ScriptExecutor;
