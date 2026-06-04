/**
 * 定时打卡任务
 * 支持：打开指定 App，查找打卡按钮并点击
 */

function clockIn(appName, buttonText, options) {
    options = options || {};
    const timeout = options.timeout || 10000;
    const afterDelay = options.afterDelay || 3000;

    toastLog("⏰ 开始打卡: " + appName);

    // 1. 打开应用
    launchApp(appName);
    sleep(afterDelay);

    // 2. 查找打卡按钮
    let btn = text(buttonText).findOne(timeout);
    if (!btn) btn = desc(buttonText).findOne(timeout / 2);
    if (!btn) btn = textContains(buttonText).findOne(timeout / 2);

    // 3. 点击
    if (btn && btn.clickable()) {
        btn.click();
        toastLog("✅ 已点击打卡按钮: " + buttonText);
        sleep(2000);
        return true;
    } else {
        toastLog("⚠️ 未找到打卡按钮: " + buttonText);
        return false;
    }
}

/**
 * 高级打卡 — 支持多步操作
 * @param {Array} steps 操作步骤数组 [{action, target, text, delay}]
 */
function clockInAdvanced(steps) {
    toastLog("⏰ 开始高级打卡流程");
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        log("步骤 " + (i + 1) + ":", step.action, step.target);

        switch (step.action) {
            case "launch":
                launchApp(step.target);
                break;
            case "click":
                let node = text(step.target).findOne(5000);
                if (!node) node = desc(step.target).findOne(3000);
                if (node && node.clickable()) node.click();
                break;
            case "input":
                let input = className("EditText").findOne(3000);
                if (input) input.setText(step.text);
                break;
            case "swipe":
                swipe(device.width / 2, device.height * 0.8, device.width / 2, device.height * 0.2, 500);
                break;
            case "wait":
                sleep(step.delay || 2000);
                break;
        }
        sleep(step.delay || 1500);
    }
    toastLog("✅ 打卡流程结束");
}

module.exports = {
    clockIn: clockIn,
    clockInAdvanced: clockInAdvanced,
};
