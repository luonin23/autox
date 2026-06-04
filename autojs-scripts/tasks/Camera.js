/**
 * 相机相关任务
 * 打开相机、拍照、切换前后置摄像头
 */

const UI = require("../core/UIAutomator.js");
const StopHelper = require("../core/StopHelper.js");

/**
 * 打开相机并拍照
 * @param {object} options 可选配置
 *   - front: 是否使用前置摄像头 (默认 false)
 *   - count: 连拍张数 (默认 1)
 *   - delay: 拍照前等待毫秒 (默认 2000)
 */
function takePhoto(options) {
    options = options || {};
    const useFront = options.front || false;
    const count = options.count || 1;
    const delay = options.delay || 2000;

    toastLog("📷 打开相机");
    launchApp("相机");
    UI.humanDelay(2500, 3500);
    if (StopHelper.check()) return false;

    // 切换前置/后置摄像头（如果需要）
    if (useFront) {
        switchToFrontCamera();
    } else {
        switchToBackCamera();
    }

    UI.humanDelay(1000, 1500);
    if (StopHelper.check()) return false;

    // 拍照
    for (let i = 0; i < count; i++) {
        if (StopHelper.check()) return false;
        if (i > 0) {
            log("📷 连拍 " + (i + 1) + "/" + count);
            UI.humanDelay(1500, 2000);
        }

        let shutter = desc("快门").findOne(3000);
        if (!shutter) shutter = text("拍照").findOne(2000);
        if (!shutter) shutter = desc("拍照").findOne(2000);
        if (!shutter) shutter = descContains("拍照").findOne(2000);

        // 有些相机 App 快门按钮没有文字，尝试按屏幕中心点击
        if (shutter && shutter.clickable()) {
            shutter.click();
        } else {
            const w = device.width;
            const h = device.height;
            click(w / 2, h * 0.85); // 大多数相机快门在底部中央
        }

        toastLog("📸 已拍照");
        StopHelper.safeSleep(delay);
    }

    return true;
}

/**
 * 切换到前置摄像头
 */
function switchToFrontCamera() {
    let switchBtn = desc("切换摄像头").findOne(2000);
    if (!switchBtn) switchBtn = descContains("前置").findOne(2000);
    if (!switchBtn) switchBtn = text("切换摄像头").findOne(2000);

    if (switchBtn && switchBtn.clickable()) {
        switchBtn.click();
        UI.humanDelay(1000, 1500);
        log("🔄 已切换到前置摄像头");
    }
}

/**
 * 切换到后置摄像头
 */
function switchToBackCamera() {
    let switchBtn = desc("切换摄像头").findOne(2000);
    if (!switchBtn) switchBtn = descContains("后置").findOne(2000);
    if (!switchBtn) switchBtn = text("切换摄像头").findOne(2000);

    if (switchBtn && switchBtn.clickable()) {
        switchBtn.click();
        UI.humanDelay(1000, 1500);
        log("🔄 已切换到后置摄像头");
    }
}

module.exports = {
    takePhoto: takePhoto,
    switchToFrontCamera: switchToFrontCamera,
    switchToBackCamera: switchToBackCamera,
};
