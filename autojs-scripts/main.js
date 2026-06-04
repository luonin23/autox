/**
 * Fold7 Agent — 主入口（v2 架构）
 *
 * v2 变更：
 * - 删除所有硬编码任务和语义解析器
 * - 入口仅负责：检查配置 → 启动对话 UI
 * - 所有业务逻辑委托给 ChatEngine（生成脚本 → 执行 → 调试闭环）
 *
 * 运行方式：
 * 1. AutoX.js 中运行：弹出对话界面，输入自然语言指令
 * 2. Termux / cron：node main.js --instruction="打开设置"
 */
"ui";

// === 模拟环境检测（Node.js 测试用）===
if (typeof device === "undefined") {
    require("./test/mock.js");
}

// 将所有代码包裹在 IIFE 中，避免 Rhino 引擎下变量名冲突
(function () {

// 导入核心模块
var StopHelper = require("./core/StopHelper.js");
var Logger = require("./core/Logger.js");
var ChatUI = require("./core/ChatUI.js");
var ScreenshotCleaner = require("./core/ScreenshotCleaner.js");

// 加载用户配置
var CONFIG = null;
try {
    CONFIG = require("./config.js");
} catch (e) {
    log("⚠️ 未找到 config.js");
    CONFIG = null;
}

// ===================== AccessibilityService 检测 =====================
function checkAccessibility() {
    if (typeof auto === "undefined") return true; // Node.js mock 环境
    if (!auto.service) {
        toastLog("❌ 无障碍服务未开启，请在系统设置中启用 AutoX.js 的无障碍权限");
        app.startActivity({
            action: "android.settings.ACCESSIBILITY_SETTINGS",
        });
        return false;
    }
    return true;
}

// ===================== 命令行参数解析 =====================
function parseArgs() {
    var args = {};
    if (typeof engines !== "undefined" && engines.myEngine) {
        var intent = engines.myEngine().execArgv;
        if (intent && intent.intent && intent.intentExtras) {
            var extras = intent.intentExtras;
            for (var key in extras) {
                args[key] = extras[key];
            }
        }
    }
    if (typeof process !== "undefined" && process.argv) {
        var argv = process.argv;
        for (var i = 2; i < argv.length; i++) {
            var arg = argv[i];
            if (arg.startsWith("--")) {
                var kv = arg.substring(2).split("=");
                args[kv[0]] = kv[1] !== undefined ? kv[1] : true;
            }
        }
    }
    return args;
}

var ARGS = parseArgs();

// ===================== 启动入口 =====================
function _startApp() {
    // 首次运行：没有配置则弹出配置页
    if (!CONFIG && typeof ui !== "undefined") {
        var ConfigUI = require("./core/ConfigUI.js");
        ConfigUI.show(function () {
            try {
                CONFIG = require("./config.js");
                toastLog("✅ 配置已保存，正在启动...");
                // 短暂延迟后启动对话界面
                sleep(800);
                ChatUI.show();
            } catch (e2) {
                toastLog("❌ 配置加载失败: " + e2.message);
            }
        });
        return;
    }

    if (!CONFIG) {
        CONFIG = { maxSteps: 15 };
    }

    main();
}

// 页面加载完成后启动（避免同步+异步重复调用）
if (typeof ui !== "undefined" && ui.post) {
    ui.post(_startApp);
} else {
    _startApp();
}

// ===================== 命令行模式：直接执行指令 =====================
function runCLI() {
    if (!checkAccessibility()) return;

    StopHelper.setup();
    StopHelper.showHint();

    var ChatEngine = require("./agent/ChatEngine.js");
    var engine = ChatEngine.create({
        onMessage: function (msg) {
            log(msg);
        },
        onScript: function (code, desc) {
            log("📜 脚本已生成:", desc);
            log("=".repeat(40));
            log(code.substring(0, 800));
            if (code.length > 800) log("... (共 " + code.length + " 字符)");
            log("=".repeat(40));
        },
        onLog: function (line) {
            log("[脚本]", line);
        },
        onStatus: function (status) {
            log("[状态]", status);
        },
        onComplete: function (report) {
            if (report.success) {
                log("✅ 任务完成");
            } else {
                log("❌ 任务失败:", report.error);
            }
            // 清理
            try { ScreenshotCleaner.clean(); } catch (e) {}
            try { Logger.cleanOldLogs(); } catch (e) {}
            try { StopHelper.teardown(); } catch (e) {}
        },
    });

    var instruction = ARGS.instruction || ARGS._ || "";
    if (!instruction) {
        log("用法: node main.js --instruction='打开微信'");
        return;
    }

    log("🚀 执行指令:", instruction);
    engine.send(instruction);
}

// ===================== 入口分发 =====================
function main() {
    // 注册停止快捷键
    StopHelper.setup();
    StopHelper.showHint();

    // 情况 1：命令行模式（Termux / Node.js）
    if (ARGS.instruction) {
        runCLI();
        return;
    }

    // 情况 2：AutoX.js 交互模式 — 启动对话 UI
    if (typeof ui !== "undefined") {
        ChatUI.show();
        return;
    }

    // 情况 3：Node.js 模拟模式（无指令）
    if (typeof process !== "undefined") {
        log("=== Fold7 Agent v2 ===");
        log("用法: node main.js --instruction='打开设置'");
        return;
    }
}

})();
