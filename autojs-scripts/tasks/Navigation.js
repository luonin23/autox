/**
 * 地图导航任务
 * 支持高德地图、百度地图
 */

const UI = require("../core/UIAutomator.js");

/**
 * 高德地图导航
 * @param {string} destination 目的地名称
 * @param {string} mode 出行方式: drive | bus | walk | ride
 */
function navigateGaode(destination, mode) {
    if (!destination) {
        toastLog("⚠️ 目的地不能为空");
        return false;
    }

    mode = mode || "drive";
    toastLog("🗺️ 高德导航到: " + destination);

    launchApp("高德地图");
    UI.humanDelay(4000, 5000);

    handleMapPopup();

    // 1. 点击搜索框
    let searchBox = text("搜索地点、公交、地铁").findOne(5000);
    if (!searchBox) searchBox = desc("搜索地点、公交、地铁").findOne(3000);
    if (!searchBox) searchBox = className("EditText").findOne(3000);

    if (searchBox && searchBox.clickable()) {
        searchBox.click();
        UI.humanDelay(1000, 1500);
    } else {
        toastLog("⚠️ 未找到搜索框");
        return false;
    }

    // 2. 输入目的地
    let input = className("EditText").findOne(3000);
    if (input) {
        input.setText(destination);
        UI.humanDelay(2000, 2500);
    } else {
        toastLog("⚠️ 未找到输入框");
        return false;
    }

    // 3. 点击搜索结果中的第一个
    let result = text(destination).findOne(5000);
    if (!result) result = textContains(destination).findOne(3000);
    if (result && result.clickable()) {
        result.click();
        UI.humanDelay(3000, 4000);
    } else {
        // 尝试点击第一个列表项
        let firstItem = descContains("地点").findOne(3000);
        if (firstItem && firstItem.clickable()) {
            firstItem.click();
            UI.humanDelay(3000, 4000);
        }
    }

    // 4. 选择出行方式
    let modeMap = {
        drive: "驾车",
        bus: "公交",
        walk: "步行",
        ride: "骑行",
    };
    let modeText = modeMap[mode] || "驾车";
    let modeBtn = text(modeText).findOne(3000);
    if (!modeBtn) modeBtn = desc(modeText).findOne(2000);
    if (modeBtn && modeBtn.clickable()) {
        modeBtn.click();
        UI.humanDelay(2000, 3000);
    }

    // 5. 点击开始导航
    let navBtn = text("开始导航").findOne(5000);
    if (!navBtn) navBtn = desc("开始导航").findOne(3000);
    if (!navBtn) navBtn = text("导航").findOne(3000);

    if (navBtn && navBtn.clickable()) {
        navBtn.click();
        toastLog("🚗 已开始导航到 " + destination);
        UI.humanDelay(2000, 3000);
        return true;
    } else {
        toastLog("⚠️ 未找到开始导航按钮");
        return false;
    }
}

/**
 * 百度地图导航
 * @param {string} destination 目的地名称
 * @param {string} mode 出行方式
 */
function navigateBaidu(destination, mode) {
    if (!destination) {
        toastLog("⚠️ 目的地不能为空");
        return false;
    }

    mode = mode || "drive";
    toastLog("🗺️ 百度导航到: " + destination);

    launchApp("百度地图");
    UI.humanDelay(4000, 5000);

    handleMapPopup();

    // 搜索并导航（逻辑与高德类似）
    let searchBox = text("搜索地点、公交、地铁").findOne(5000);
    if (!searchBox) searchBox = desc("搜索地点、公交、地铁").findOne(3000);
    if (!searchBox) searchBox = className("EditText").findOne(3000);

    if (searchBox && searchBox.clickable()) {
        searchBox.click();
        UI.humanDelay(1000, 1500);
        let input = className("EditText").findOne(3000);
        if (input) {
            input.setText(destination);
            UI.humanDelay(2000, 2500);
        }
    }

    let result = text(destination).findOne(5000);
    if (!result) result = textContains(destination).findOne(3000);
    if (result && result.clickable()) {
        result.click();
        UI.humanDelay(3000, 4000);
    }

    let navBtn = text("到这去").findOne(5000);
    if (!navBtn) navBtn = desc("到这去").findOne(3000);
    if (navBtn && navBtn.clickable()) {
        navBtn.click();
        UI.humanDelay(2000, 3000);
    }

    let startNav = text("开始导航").findOne(5000);
    if (startNav && startNav.clickable()) {
        startNav.click();
        toastLog("🚗 百度地图导航开始");
        return true;
    }

    toastLog("⚠️ 百度地图导航启动失败");
    return false;
}

/**
 * 处理地图应用弹窗
 */
function handleMapPopup() {
    let closeBtn = text("关闭").findOne(2000);
    if (!closeBtn) closeBtn = desc("关闭").findOne(1500);
    if (!closeBtn) closeBtn = text("知道了").findOne(1500);
    if (!closeBtn) closeBtn = text("取消").findOne(1500);
    if (closeBtn && closeBtn.clickable()) {
        closeBtn.click();
        UI.humanDelay(500, 800);
    }
}

module.exports = {
    navigateGaode: navigateGaode,
    navigateBaidu: navigateBaidu,
};
