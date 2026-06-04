/**
 * 钉钉打卡任务（专用优化版）
 * 针对钉钉的 UI 特点做了专门适配
 */

const UI = require("../core/UIAutomator.js");
const StopHelper = require("../core/StopHelper.js");

/**
 * 钉钉快速打卡
 * @param {string} buttonText 打卡按钮文字，默认 "上班打卡"
 * @param {object} options 可选配置
 */
function dingTalkClockIn(buttonText, options) {
    buttonText = buttonText || "上班打卡";
    options = options || {};
    const timeout = options.timeout || 15000;

    toastLog("⏰ 开始钉钉打卡");

    // 1. 打开钉钉
    launchApp("钉钉");
    StopHelper.safeSleep(5000);

    // 2. 等待首页加载（尝试多种特征）
    let loaded = false;
    for (let i = 0; i < 5; i++) {
        if (StopHelper.check()) return false;
        if (text("消息").exists() || text("工作台").exists() || desc("工作台").exists()) {
            loaded = true;
            break;
        }
        sleep(2000);
    }

    if (!loaded) {
        toastLog("⚠️ 钉钉首页加载超时");
        return false;
    }

    // 3. 点击工作台
    let workbench = text("工作台").findOne(5000);
    if (!workbench) workbench = desc("工作台").findOne(3000);
    if (workbench && workbench.clickable()) {
        workbench.click();
        StopHelper.safeSleep(3000);
    } else {
        // 备用：通过底部导航点击
        let navWorkbench = descContains("工作台").findOne(3000);
        if (navWorkbench && navWorkbench.clickable()) {
            navWorkbench.click();
            StopHelper.safeSleep(3000);
        }
    }

    if (StopHelper.check()) return false;

    // 4. 查找考勤打卡入口
    let attendance = text("考勤打卡").findOne(timeout);
    if (!attendance) attendance = desc("考勤打卡").findOne(timeout / 2);
    if (!attendance) attendance = textContains("考勤").findOne(timeout / 2);

    if (attendance && attendance.clickable()) {
        attendance.click();
        StopHelper.safeSleep(5000); // 考勤页面加载较慢
    } else {
        toastLog("⚠️ 未找到考勤打卡入口");
        return false;
    }

    if (StopHelper.check()) return false;

    // 5. 等待打卡页面
    StopHelper.safeSleep(3000);

    if (StopHelper.check()) return false;

    // 6. 查找并点击打卡按钮
    let btn = text(buttonText).findOne(timeout);
    if (!btn) btn = desc(buttonText).findOne(timeout / 2);
    if (!btn) btn = textContains(buttonText.replace("打卡", "")).findOne(timeout / 2);

    if (btn && btn.clickable()) {
        // 钉钉有防作弊，点击前稍作停顿
        UI.humanDelay(800, 1500);
        btn.click();
        toastLog("✅ 已点击: " + buttonText);
        StopHelper.safeSleep(3000);

        // 7. 处理可能的确认弹窗
        let confirmBtn = text("确定").findOne(3000);
        if (!confirmBtn) confirmBtn = text("确认").findOne(2000);
        if (confirmBtn && confirmBtn.clickable()) {
            UI.humanDelay(500, 1000);
            confirmBtn.click();
            StopHelper.safeSleep(2000);
        }

        return true;
    } else {
        toastLog("⚠️ 未找到打卡按钮: " + buttonText);
        return false;
    }
}

/**
 * 钉钉下班打卡
 */
function dingTalkClockOut(options) {
    return dingTalkClockIn("下班打卡", options);
}

module.exports = {
    clockIn: dingTalkClockIn,
    clockOut: dingTalkClockOut,
};
