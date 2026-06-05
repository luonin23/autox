/**
 * 日志与历史记录系统
 * 记录每次任务执行的指令、结果、截图，支持回溯和统计
 */

var Logger = (function () {
    var LOG_DIR = "/sdcard/fold7-agent/logs/";
    var LOG_FILE = LOG_DIR + "history.jsonl";

    // 确保日志目录存在
    try {
        files.createWithDirs(LOG_DIR);
    } catch (e) {
        log("⚠️ 创建日志目录失败:", e.message);
    }

    /**
     * 写入一条日志记录
     * @param {object} record 记录对象
     */
    function write(record) {
        record = record || {};
        record.timestamp = new Date().toISOString();
        record.device = device.model || "unknown";

        var line = JSON.stringify(record) + "\n";
        try {
            // AutoX.js 的 files 追加写入
            files.append(LOG_FILE, line);
        } catch (e) {
            log("⚠️ 写入日志失败:", e.message);
        }
    }

    /**
     * 记录任务开始
     */
    function taskStart(type, instruction, params) {
        write({
            event: "task_start",
            type: type,
            instruction: instruction,
            params: params,
        });
    }

    /**
     * 记录任务结束
     */
    function taskEnd(type, success, message, steps) {
        write({
            event: "task_end",
            type: type,
            success: success,
            message: message,
            steps: steps || 0,
        });
    }

    /**
     * 记录单步执行
     */
    function stepLog(stepIndex, action, target, result) {
        write({
            event: "step",
            stepIndex: stepIndex,
            action: action,
            target: target,
            result: result,
        });
    }

    /**
     * 记录错误
     */
    function errorLog(error, screenshot) {
        write({
            event: "error",
            error: error,
            screenshot: screenshot,
        });
    }

    /**
     * 读取最近 N 条历史记录
     */
    function readRecent(n) {
        n = n || 20;
        try {
            if (!files.exists(LOG_FILE)) return [];
            var content = files.read(LOG_FILE);
            var lines = content.trim().split("\n").filter(function (l) {
                return l.trim().length > 0;
            });
            var records = lines.map(function (line) {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(function (r) {
                return r !== null;
            });
            return records.slice(-n);
        } catch (e) {
            log("⚠️ 读取日志失败:", e.message);
            return [];
        }
    }

    /**
     * 清理旧日志（保留最近 30 天，防止日志无限增长）
     */
    function cleanOldLogs() {
        try {
            if (!files.exists(LOG_FILE)) return;
            var content = files.read(LOG_FILE);
            var lines = content.trim().split("\n").filter(function (l) {
                return l.trim().length > 0;
            });
            var maxLines = 5000; // 最多保留 5000 条记录
            if (lines.length <= maxLines) return;

            var keepLines = lines.slice(-maxLines);
            files.write(LOG_FILE, keepLines.join("\n") + "\n");
            log("📝 日志已清理，保留最近 " + keepLines.length + " 条记录");
        } catch (e) {
            log("⚠️ 日志清理失败:", e.message);
        }
    }

    /**
     * 获取今日统计
     */
    function todayStats() {
        var today = new Date().toISOString().substring(0, 10);
        var records = readRecent(1000);
        var success = 0;
        var failed = 0;
        records.forEach(function (r) {
            if (r.timestamp && r.timestamp.indexOf(today) === 0) {
                if (r.event === "task_end") {
                    if (r.success) success++;
                    else failed++;
                }
            }
        });
        return { date: today, success: success, failed: failed };
    }

    return {
        taskStart: taskStart,
        taskEnd: taskEnd,
        stepLog: stepLog,
        errorLog: errorLog,
        readRecent: readRecent,
        todayStats: todayStats,
        cleanOldLogs: cleanOldLogs,
    };
})();

module.exports = Logger;
