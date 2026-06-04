/**
 * 支付宝常用任务
 * 扫码、付款码、收能量、查看账单等
 */

const UI = require("../core/UIAutomator.js");
const StopHelper = require("../core/StopHelper.js");

/**
 * 打开支付宝付款码
 */
function openPayCode() {
    toastLog("💳 打开支付宝付款码");
    launchApp("支付宝");
    UI.humanDelay(3000, 4000);
    if (StopHelper.check()) return false;

    handleAlipayPopup();

    // 首页点击"付钱/收钱"
    let payBtn = text("付钱").findOne(5000);
    if (!payBtn) payBtn = desc("付钱").findOne(3000);
    if (!payBtn) payBtn = textContains("付钱").findOne(3000);

    if (payBtn && payBtn.clickable()) {
        payBtn.click();
        toastLog("✅ 已打开付款码");
        UI.humanDelay(2000, 3000);
        return true;
    }

    toastLog("⚠️ 未找到付款码入口");
    return false;
}

/**
 * 打开扫一扫
 */
function openScan() {
    toastLog("📷 打开支付宝扫一扫");
    launchApp("支付宝");
    UI.humanDelay(3000, 4000);
    if (StopHelper.check()) return false;

    handleAlipayPopup();

    let scanBtn = desc("扫一扫").findOne(5000);
    if (!scanBtn) scanBtn = text("扫一扫").findOne(3000);

    if (scanBtn && scanBtn.clickable()) {
        scanBtn.click();
        toastLog("✅ 已打开扫一扫");
        UI.humanDelay(2000, 3000);
        return true;
    }

    toastLog("⚠️ 未找到扫一扫入口");
    return false;
}

/**
 * 蚂蚁森林收能量（简化版）
 */
function collectEnergy() {
    toastLog("🌳 开始蚂蚁森林收能量");
    launchApp("支付宝");
    UI.humanDelay(3000, 4000);
    if (StopHelper.check()) return false;

    handleAlipayPopup();

    // 搜索蚂蚁森林
    let searchBtn = desc("搜索").findOne(3000);
    if (!searchBtn) searchBtn = text("搜索").findOne(2000);
    if (searchBtn && searchBtn.clickable()) {
        searchBtn.click();
        UI.humanDelay(1000, 1500);
        let input = className("EditText").findOne(3000);
        if (input) {
            input.setText("蚂蚁森林");
            UI.humanDelay(2000, 2500);
        }
    }
    if (StopHelper.check()) return false;

    // 点击搜索结果
    let result = text("蚂蚁森林").findOne(5000);
    if (!result) result = desc("蚂蚁森林").findOne(3000);
    if (result && result.clickable()) {
        result.click();
        UI.humanDelay(4000, 5000);
        if (StopHelper.check()) return false;

        // 查找可收取的能量球（通常是带有数字的圆形按钮）
        // 由于能量球没有固定文字，这里使用通用策略：查找所有可点击节点并尝试点击
        let energyNodes = classNameContains("Image").find();
        let collected = 0;
        energyNodes.forEach(function (node) {
            if (StopHelper.check()) return;
            if (node.clickable() && node.bounds().width() > 50 && node.bounds().width() < 150) {
                node.click();
                UI.humanDelay(800, 1200);
                collected++;
            }
        });

        toastLog("✅ 已尝试收取 " + collected + " 个能量球");
        return true;
    }

    toastLog("⚠️ 未进入蚂蚁森林");
    return false;
}

/**
 * 处理支付宝常见弹窗
 */
function handleAlipayPopup() {
    let closeBtn = text("关闭").findOne(2000);
    if (!closeBtn) closeBtn = desc("关闭").findOne(1500);
    if (!closeBtn) closeBtn = text("暂不").findOne(1500);
    if (closeBtn && closeBtn.clickable()) {
        closeBtn.click();
        UI.humanDelay(500, 800);
    }
}

module.exports = {
    openPayCode: openPayCode,
    openScan: openScan,
    collectEnergy: collectEnergy,
};
