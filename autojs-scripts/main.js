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

// 导入模块
const ModelClient = require("./core/ModelClient.js");
const UIAutomator = require("./core/UIAutomator.js");
const Logger = require("./core/Logger.js");
const sendWeChatMessage = require("./tasks/WeChatSend.js");
const ClockIn = require("./tasks/ClockIn.js");
const DingTalk = require("./tasks/DingTalk.js");
const SystemSettings = require("./tasks/SystemSettings.js");
const Workflow = require("./tasks/Workflow.js");
const Camera = require("./tasks/Camera.js");
const Taobao = require("./tasks/Taobao.js");
const Alipay = require("./tasks/Alipay.js");
const Navigation = require("./tasks/Navigation.js");

// 加载用户配置
let CONFIG = null;
try {
    CONFIG = require("./config.js");
} catch (e) {
    log("⚠️ 未找到 config.js，使用空配置");
    CONFIG = { maxSteps: 15 };
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
    const args = {};
    if (typeof engines !== "undefined" && engines.myEngine) {
        const intent = engines.myEngine().execArgv;
        if (intent && intent.intent && intent.intentExtras) {
            const extras = intent.intentExtras;
            for (let key in extras) {
                args[key] = extras[key];
            }
        }
    }
    if (typeof process !== "undefined" && process.argv) {
        const argv = process.argv;
        for (let i = 2; i < argv.length; i++) {
            const arg = argv[i];
            if (arg.startsWith("--")) {
                const kv = arg.substring(2).split("=");
                args[kv[0]] = kv[1] !== undefined ? kv[1] : true;
            }
        }
    }
    return args;
}

const ARGS = parseArgs();

// ===================== 智能任务执行器（带错误恢复）=====================
function runAgent(instruction) {
    if (!checkAccessibility()) return;

    Logger.taskStart("agent", instruction, null);
    toastLog("🚀 开始执行任务: " + instruction);

    const maxSteps = CONFIG.maxSteps || 15;
    const maxRecoveries = 2;
    let step = 0;
    let done = false;
    let recoveryCount = 0;

    while (step < maxSteps && !done) {
        step++;
        log("\n========== 步骤 " + step + " ==========");

        try {
            const screenContext = UIAutomator.getScreenContext(1500);
            log("📱 屏幕内容:", screenContext.substring(0, 200) + "...");

            const cmd = ModelClient.callModel(instruction, screenContext);
            if (!cmd || !cmd.action) {
                log("⚠️ 模型返回无效指令");
                break;
            }

            Logger.stepLog(step, cmd.action, cmd.target, "ok");
            const shouldContinue = UIAutomator.executeCommand(cmd);
            if (!shouldContinue || cmd.action === "done") {
                done = true;
                break;
            }
        } catch (e) {
            log("❌ 步骤出错:", e.message);
            toastLog("出错了: " + e.message);

            const screenshotPath = UIAutomator.captureDebug("error_step_" + step + ".png");
            Logger.errorLog(e.message, screenshotPath);

            if (recoveryCount < maxRecoveries) {
                recoveryCount++;
                log("🔄 尝试错误恢复 (" + recoveryCount + "/" + maxRecoveries + ")...");

                try {
                    const errorScreen = UIAutomator.getScreenContext(1000);
                    const recoveryInstruction =
                        `任务：${instruction}\n` +
                        `之前执行时出错了：${e.message}\n` +
                        `当前屏幕：${errorScreen}\n` +
                        `请修复问题并继续完成任务。`;

                    const recoveryCmd = ModelClient.callModel(recoveryInstruction, errorScreen);
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
                success = Camera.takePhoto({
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

    const variables = {};
    for (let key in ARGS) {
        if (key.startsWith("var_")) {
            variables["$" + key.substring(4)] = ARGS[key];
        }
    }

    const success = Workflow.execute(workflow, variables);
    Logger.taskEnd("workflow", success, success ? "完成" : "失败", (workflow.steps || []).length);
}

/**
 * 从文件加载工作流
 */
function runWorkflowFromFile(filePath) {
    try {
        const content = files.read(filePath);
        runWorkflow(content);
    } catch (e) {
        toastLog("❌ 读取工作流文件失败: " + e.message);
    }
}

// ===================== 入口分发 =====================
function main() {
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

    // 情况 5：AutoX.js 对话框交互模式
    if (typeof rawInput !== "undefined") {
        const instruction = rawInput(
            "请输入任务指令",
            "给张三发微信说晚上吃饭"
        );
        if (instruction) {
            runAgent(instruction);
        }
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
