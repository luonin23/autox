/**
 * Fold7 Agent — 主入口
 *
 * 运行方式：
 * 1. 在 AutoX.js 中打开此文件并运行（交互对话框）
 * 2. 设置为定时任务（AutoX.js 的定时任务功能）
 * 3. Termux crontab 调用：node main.js --task=dingtalk --button="上班打卡"
 * 4. 工作流：node main.js --workflow='{"steps":[...]}'
 * 5. 工作流文件：node main.js --workflowFile=../workflows/dingtalk-clockin.json --var_button="上班打卡"
 * 6. Node.js 模拟测试：node -r ./test/mock.js main.js --instruction="打开设置"
 */

// === 模拟环境检测 ===
if (typeof device === "undefined") {
    require("./test/mock.js");
}

// 将所有代码包裹在 IIFE 中，避免 Rhino 引擎下变量名与全局冲突
(function () {

// 导入模块
var StopHelper = require("./core/StopHelper.js");
var ModelClient = require("./core/ModelClient.js");
var UIAutomator = require("./core/UIAutomator.js");
var Logger = require("./core/Logger.js");
var SemanticParser = require("./core/SemanticParser.js");
var TaskPlanner = require("./core/TaskPlanner.js");
var sendWeChatMessage = require("./tasks/WeChatSend.js");
var ClockIn = require("./tasks/ClockIn.js");
var DingTalk = require("./tasks/DingTalk.js");
var SystemSettings = require("./tasks/SystemSettings.js");
var Workflow = require("./tasks/Workflow.js");
var CameraTask = require("./tasks/Camera.js");
var Taobao = require("./tasks/Taobao.js");
var Alipay = require("./tasks/Alipay.js");
var Navigation = require("./tasks/Navigation.js");
var ScreenshotCleaner = require("./core/ScreenshotCleaner.js");
var ChatUI = require("./core/ChatUI.js");

// 加载用户配置
let CONFIG = null;
try {
    CONFIG = require("./config.js");
} catch (e) {
    log("⚠️ 未找到 config.js");
    CONFIG = null;
}

// 启动入口（包装为函数，避免顶层 return 在 Rhino 引擎中报错）
function _startApp() {
    if (!CONFIG && typeof ui !== "undefined") {
        var ConfigUI = require("./core/ConfigUI.js");
        ConfigUI.show(function () {
            // 保存后重新加载配置并继续
            try {
                CONFIG = require("./config.js");
                main();
            } catch (e2) {
                toastLog("❌ 配置加载失败: " + e2.message);
            }
        });
        // 首次显示 UI 后暂停执行，等待用户保存
        return;
    }

    if (!CONFIG) {
        CONFIG = { maxSteps: 15 };
    }

    main();
}

// 页面加载完成后启动
if (typeof ui !== "undefined" && ui.post) {
    ui.post(_startApp);
} else {
    _startApp();
}

// ===================== AccessibilityService 检测 =====================
function checkAccessibility() {
    if (typeof auto === "undefined") return true; // Node.js mock 环境
    if (!auto.service) {
        toastLog("❌ 无障碍服务未开启，请在系统设置中启用 AutoX.js 的无障碍权限");
        // 尝试跳转到无障碍设置
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
            for (let key in extras) {
                args[key] = extras[key];
            }
        }
    }
    if (typeof process !== "undefined" && process.argv) {
        var argv = process.argv;
        for (let i = 2; i < argv.length; i++) {
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

// ===================== 智能任务执行器（带错误恢复）=====================
function runAgent(instruction) {
    if (!checkAccessibility()) return;

    Logger.taskStart("agent", instruction, null);
    toastLog("🚀 开始执行任务: " + instruction);

    // ========== 第 1 步：语义解析 ==========
    log("🔍 正在解析用户意图...");
    var intention = SemanticParser.parse(instruction);
    log("📋 解析结果:", JSON.stringify(intention));

    // ========== 第 2 步：任务规划 ==========
    log("📝 正在生成执行计划...");
    let planSteps = TaskPlanner.plan(intention);
    let usePlanner = planSteps && planSteps.length > 0;

    if (usePlanner) {
        log("✅ 任务规划器生成 " + planSteps.length + " 个步骤");
        planSteps.forEach(function (s, i) {
            log("   步骤 " + (i + 1) + ": [" + s.action + "] " + (s.reason || ""));
        });
    } else {
        log("⚠️ 任务规划器无法处理此指令，回退到模型决策");
    }

    var maxSteps = CONFIG.maxSteps || 15;
    var maxRecoveries = 2;
    let step = 0;
    let done = false;
    let recoveryCount = 0;
    let planIndex = 0;

    while (step < maxSteps && !done && !StopHelper.check()) {
        step++;
        log("\n========== 步骤 " + step + " ==========");

        if (StopHelper.check()) {
            toastLog("⏹️ 脚本已停止");
            break;
        }

        try {
            let cmd = null;

            if (usePlanner && planIndex < planSteps.length) {
                // 优先使用规划器步骤
                cmd = planSteps[planIndex];
                planIndex++;
                log("📌 执行规划步骤 [" + planIndex + "/" + planSteps.length + "]: " + cmd.reason);
            } else {
                // 规划器步骤已用完，或规划器无法处理，回退到模型
                var screenContext = UIAutomator.getScreenContext(1500);
                log("📱 屏幕内容:", screenContext.substring(0, 200) + "...");

                if (StopHelper.check()) break;

                cmd = ModelClient.callModel(instruction, screenContext);
                if (!cmd || !cmd.action) {
                    log("⚠️ 模型返回无效指令");
                    break;
                }
            }

            if (StopHelper.check()) break;

            Logger.stepLog(step, cmd.action, cmd.target, "ok");
            var shouldContinue = UIAutomator.executeCommand(cmd);
            if (!shouldContinue || cmd.action === "done") {
                done = true;
                break;
            }
        } catch (e) {
            log("❌ 步骤出错:", e.message);
            toastLog("出错了: " + e.message);

            var screenshotPath = UIAutomator.captureDebug("error_step_" + step + ".png");
            Logger.errorLog(e.message, screenshotPath);

            if (recoveryCount < maxRecoveries) {
                recoveryCount++;
                log("🔄 尝试错误恢复 (" + recoveryCount + "/" + maxRecoveries + ")...");

                try {
                    var errorScreen = UIAutomator.getScreenContext(1000);
                    var recoveryInstruction =
                        `任务：${instruction}\n` +
                        `之前执行时出错了：${e.message}\n` +
                        `当前屏幕：${errorScreen}\n` +
                        `请修复问题并继续完成任务。`;

                    var recoveryCmd = ModelClient.callModel(recoveryInstruction, errorScreen);
                    if (recoveryCmd && recoveryCmd.action) {
                        log("🤖 恢复指令:", JSON.stringify(recoveryCmd));
                        UIAutomator.executeCommand(recoveryCmd);
                        if (recoveryCmd.action === "done") {
                            done = true;
                            break;
                        }
                        continue;
                    }
                } catch (recoveryErr) {
                    log("❌ 恢复也失败了:", recoveryErr.message);
                }
            }

            break;
        }
    }

    if (step >= maxSteps) {
        toastLog("⚠️ 达到最大步数限制，任务未完成");
        Logger.taskEnd("agent", false, "达到最大步数限制", step);
    } else if (done) {
        toastLog("✅ 任务结束");
        Logger.taskEnd("agent", true, "任务完成", step);
    } else {
        toastLog("❌ 任务中断");
        Logger.taskEnd("agent", false, "任务中断", step);
    }

    // 自动清理过期截图和日志
    try { ScreenshotCleaner.clean(); } catch (e) { /* ignore */ }
    try { Logger.cleanOldLogs(); } catch (e) { /* ignore */ }
    try { StopHelper.teardown(); } catch (e) { /* ignore */ }
}

// ===================== 快速任务（不经过模型）=====================
function quickTask(taskType, params) {
    if (!checkAccessibility()) return;

    params = params || {};
    log("⚡ 快速任务:", taskType, JSON.stringify(params));
    Logger.taskStart("quick", null, { taskType: taskType, params: params });

    let success = true;
    try {
        switch (taskType) {
            case "wechat":
                success = sendWeChatMessage(params.contact, params.message);
                break;
            case "clockin":
                success = ClockIn.clockIn(params.app, params.button, params.options);
                break;
            case "dingtalk":
                if (params.type === "out") {
                    success = DingTalk.clockOut(params.options);
                } else {
                    success = DingTalk.clockIn(params.button, params.options);
                }
                break;
            case "settings":
                success = SystemSettings.openSettings(params.page);
                break;
            case "brightness":
                success = SystemSettings.setBrightness(parseInt(params.level));
                break;
            case "camera":
                success = CameraTask.takePhoto({
                    front: params.front === "true" || params.front === true,
                    count: parseInt(params.count) || 1,
                    delay: parseInt(params.delay) || 2000,
                });
                break;
            case "taobao":
                success = Taobao.searchProduct(params.keyword, {
                    filter: params.filter,
                    clickFirst: params.clickFirst === "true" || params.clickFirst === true,
                });
                break;
            case "alipay_paycode":
                success = Alipay.openPayCode();
                break;
            case "alipay_scan":
                success = Alipay.openScan();
                break;
            case "alipay_energy":
                success = Alipay.collectEnergy();
                break;
            case "navigate":
                if (params.app === "baidu") {
                    success = Navigation.navigateBaidu(params.destination, params.mode);
                } else {
                    success = Navigation.navigateGaode(params.destination, params.mode);
                }
                break;
            default:
                toastLog("⚠️ 未知任务类型: " + taskType);
                success = false;
        }
    } catch (e) {
        log("❌ 快速任务出错:", e.message);
        success = false;
    }

    Logger.taskEnd("quick", success, success ? "完成" : "失败", 1);

    // 自动清理过期截图
    try { ScreenshotCleaner.clean(); } catch (e) { /* ignore */ }
}

// ===================== 工作流执行 =====================
function runWorkflow(workflowInput) {
    if (!checkAccessibility()) return;

    let workflow = null;
    try {
        if (typeof workflowInput === "string" && workflowInput.trim().startsWith("{")) {
            workflow = JSON.parse(workflowInput);
        } else if (typeof workflowInput === "object") {
            workflow = workflowInput;
        } else {
            throw new Error("工作流格式不正确");
        }
    } catch (e) {
        toastLog("❌ 工作流解析失败: " + e.message);
        return;
    }

    Logger.taskStart("workflow", workflow.name, null);

    var variables = {};
    for (let key in ARGS) {
        if (key.startsWith("var_")) {
            variables["$" + key.substring(4)] = ARGS[key];
        }
    }

    var success = Workflow.execute(workflow, variables);
    Logger.taskEnd("workflow", success, success ? "完成" : "失败", (workflow.steps || []).length);

    // 自动清理过期截图
    try { ScreenshotCleaner.clean(); } catch (e) { /* ignore */ }
}

/**
 * 从文件加载工作流
 */
function runWorkflowFromFile(filePath) {
    try {
        var content = files.read(filePath);
        runWorkflow(content);
    } catch (e) {
        toastLog("❌ 读取工作流文件失败: " + e.message);
    }
}

// ===================== 入口分发 =====================
function main() {
    // 注册停止快捷键
    StopHelper.setup();
    StopHelper.showHint();

    // 情况 1：工作流文件路径
    if (ARGS.workflowFile) {
        runWorkflowFromFile(ARGS.workflowFile);
        return;
    }

    // 情况 2：工作流 JSON 字符串
    if (ARGS.workflow) {
        runWorkflow(ARGS.workflow);
        return;
    }

    // 情况 3：快速任务（Termux / cron）
    if (ARGS.task) {
        quickTask(ARGS.task, ARGS);
        return;
    }

    // 情况 4：智能指令（命令行）
    if (ARGS.instruction) {
        runAgent(ARGS.instruction);
        return;
    }

    // 情况 5：AutoX.js 交互模式 — 启动 ChatUI（带底部 Tab：对话 + 配置）
    if (typeof ui !== "undefined") {
        ChatUI.show();
        return;
    }

    // 情况 6：Node.js 模拟模式（无交互）
    if (typeof process !== "undefined") {
        log("=== Node.js 模拟模式 ===");
        log("用法示例:");
        log("  --instruction='打开设置'");
        log("  --task=wechat --contact=张三 --message=你好");
        log("  --task=dingtalk --button='上班打卡'");
        log("  --task=camera --count=1");
        log("  --task=alipay_paycode");
        log("  --task=navigate --destination=天安门 --mode=drive");
        log("  --workflow='{\"name\":\"test\",\"steps\":[{\"action\":\"home\"}]}'");
        log("  --workflowFile=../workflows/dingtalk-clockin.json");
        return;
    }
}

main();

})();
