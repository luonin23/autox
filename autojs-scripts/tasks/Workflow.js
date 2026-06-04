/**
 * 工作流任务编排
 * 用 JSON 定义复杂多步操作，支持条件分支、循环、变量替换
 *
 * 示例工作流：
 * {
 *   name: "钉钉打卡",
 *   steps: [
 *     { action: "launch", target: "钉钉", delay: 5000 },
 *     { action: "click", target: "工作台", delay: 3000 },
 *     { action: "click", target: "考勤打卡", delay: 5000 },
 *     { action: "click", target: "上班打卡", delay: 3000 },
 *     { action: "if", condition: { type: "exists", target: "确定" }, then: [{ action: "click", target: "确定" }] },
 *     { action: "done" }
 *   ]
 * }
 */

const UI = require("../core/UIAutomator.js");

/**
 * 执行工作流
 * @param {object} workflow 工作流定义对象
 * @param {object} variables 变量替换表 { "$name": "张三" }
 */
function executeWorkflow(workflow, variables) {
    variables = variables || {};
    const steps = workflow.steps || [];
    const name = workflow.name || "未命名工作流";

    toastLog("🔄 开始工作流: " + name);
    log("📋 工作流步骤数:", steps.length);

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        log("▶️ 步骤 " + (i + 1) + "/" + steps.length + ":", step.action, step.target || "");

        try {
            const result = executeStep(step, variables);
            if (result === "done") {
                log("⏹️ 工作流正常结束");
                break;
            }
            if (result === false) {
                log("⏹️ 工作流被中断");
                return false;
            }
        } catch (e) {
            log("❌ 工作流步骤失败:", e.message);
            UI.captureDebug("workflow_error_step_" + (i + 1) + ".png");
            return false;
        }
    }

    toastLog("✅ 工作流完成: " + name);
    return true;
}

/**
 * 执行单步
 */
function executeStep(step, variables) {
    // 变量替换
    const target = replaceVars(step.target, variables);
    const stepText = replaceVars(step.text, variables);

    switch (step.action) {
        case "launch":
            launchApp(target);
            sleep(step.delay || 3000);
            break;
        case "click":
            UI.safeClick(target, step.timeout || 5000);
            sleep(step.delay || 1500);
            break;
        case "longclick":
            UI.safeLongClick(target, step.duration || 1000, step.timeout || 5000);
            sleep(step.delay || 1500);
            break;
        case "input":
            UI.safeInput(target, stepText);
            sleep(step.delay || 1000);
            break;
        case "swipe": {
            const w = device.width;
            const h = device.height;
            const cx = w / 2;
            const cy = h / 2;
            if (target === "up") swipe(cx, cy + 400, cx, cy - 400, 300);
            else if (target === "down") swipe(cx, cy - 400, cx, cy + 400, 300);
            else if (target === "left") swipe(cx + 400, cy, cx - 400, cy, 300);
            else if (target === "right") swipe(cx - 400, cy, cx + 400, cy, 300);
            sleep(step.delay || 1000);
            break;
        }
        case "back":
            back();
            sleep(step.delay || 800);
            break;
        case "home":
            home();
            sleep(step.delay || 800);
            break;
        case "wait":
            sleep(step.delay || 2000);
            break;
        case "if":
            return executeCondition(step, variables);
        case "loop":
            return executeLoop(step, variables);
        case "screenshot":
            UI.captureDebug(target || "workflow_screenshot.png");
            break;
        case "toast":
            toastLog(target);
            break;
        case "done":
            return "done"; // 返回特殊标记表示正常完成
        default:
            log("⚠️ 未知 action:", step.action);
    }
    return true;
}

/**
 * 条件分支
 */
function executeCondition(step, variables) {
    const cond = step.condition || {};
    const matched = evaluateCondition(cond);

    if (matched && step.then) {
        log("🔀 条件满足，执行 then 分支");
        for (let i = 0; i < step.then.length; i++) {
            if (!executeStep(step.then[i], variables)) return false;
        }
    } else if (!matched && step.else) {
        log("🔀 条件不满足，执行 else 分支");
        for (let i = 0; i < step.else.length; i++) {
            if (!executeStep(step.else[i], variables)) return false;
        }
    }
    return true;
}

/**
 * 条件判断
 */
function evaluateCondition(cond) {
    switch (cond.type) {
        case "exists":
            return text(cond.target).exists() || desc(cond.target).exists();
        case "not_exists":
            return !text(cond.target).exists() && !desc(cond.target).exists();
        case "equals":
            const actual = UI.getScreenContext(100);
            return actual.indexOf(cond.target) >= 0;
        default:
            return false;
    }
}

/**
 * 循环执行
 */
function executeLoop(step, variables) {
    const maxIter = step.maxIterations || 10;
    const body = steps = step.steps || [];
    for (let iter = 0; iter < maxIter; iter++) {
        log("🔁 循环 " + (iter + 1) + "/" + maxIter);
        for (let i = 0; i < body.length; i++) {
            if (!executeStep(body[i], variables)) return false;
        }
        // 如果指定了 until 条件，检查是否退出
        if (step.until && evaluateCondition(step.until)) {
            log("🔁 循环条件满足，退出循环");
            break;
        }
    }
    return true;
}

/**
 * 变量替换
 */
function replaceVars(str, vars) {
    if (!str || typeof str !== "string") return str;
    let result = str;
    for (let key in vars) {
        result = result.split(key).join(vars[key]);
    }
    return result;
}

module.exports = {
    execute: executeWorkflow,
};
