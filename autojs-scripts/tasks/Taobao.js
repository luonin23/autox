/**
 * 淘宝相关任务
 * 搜索商品、查看订单等
 */

const UI = require("../core/UIAutomator.js");
const StopHelper = require("../core/StopHelper.js");

/**
 * 淘宝搜索商品
 * @param {string} keyword 搜索关键词
 * @param {object} options 可选配置
 *   - filter: 筛选条件（如"销量"、"价格从低到高"）
 *   - clickFirst: 是否点击第一个商品 (默认 false)
 */
function searchProduct(keyword, options) {
    options = options || {};
    if (!keyword) {
        toastLog("⚠️ 搜索关键词不能为空");
        return false;
    }

    toastLog("🛒 淘宝搜索: " + keyword);

    // 1. 打开淘宝
    launchApp("手机淘宝");
    UI.humanDelay(3000, 4000);
    if (StopHelper.check()) return false;

    // 2. 处理弹窗（红包、升级等）
    handlePopup();

    // 3. 点击搜索框
    let searchBox = text("搜索宝贝").findOne(5000);
    if (!searchBox) searchBox = desc("搜索").findOne(3000);
    if (!searchBox) searchBox = className("EditText").findOne(3000);

    if (searchBox && searchBox.clickable()) {
        searchBox.click();
        UI.humanDelay(800, 1200);
    } else {
        toastLog("⚠️ 未找到搜索框");
        UI.captureDebug("taobao_search_not_found.png");
        return false;
    }

    // 4. 输入关键词
    let input = className("EditText").findOne(3000);
    if (input) {
        input.setText(keyword);
        UI.humanDelay(1000, 1500);
    } else {
        toastLog("⚠️ 未找到搜索输入框");
        return false;
    }
    if (StopHelper.check()) return false;

    // 5. 点击搜索按钮
    let searchBtn = text("搜索").findOne(3000);
    if (!searchBtn) searchBtn = desc("搜索").findOne(2000);
    if (searchBtn && searchBtn.clickable()) {
        searchBtn.click();
        UI.humanDelay(3000, 4000);
    } else {
        // 尝试回车
        KeyCode("KEYCODE_ENTER");
        UI.humanDelay(3000, 4000);
    }

    // 6. 筛选（如果指定了）
    if (options.filter) {
        applyFilter(options.filter);
    }
    if (StopHelper.check()) return false;

    // 7. 点击第一个商品（如果指定了）
    if (options.clickFirst) {
        UI.humanDelay(2000, 3000);
        if (StopHelper.check()) return false;
        let firstItem = descContains("商品").findOne(5000);
        if (!firstItem) {
            // 淘宝商品列表节点通常有特定特征
            firstItem = classNameContains("Grid").findOne(5000);
        }
        if (firstItem && firstItem.clickable()) {
            firstItem.click();
            toastLog("🛒 已打开第一个商品");
            UI.humanDelay(2000, 3000);
        }
    }

    return true;
}

/**
 * 处理淘宝常见弹窗
 */
function handlePopup() {
    let closeBtn = text("关闭").findOne(2000);
    if (!closeBtn) closeBtn = desc("关闭").findOne(1500);
    if (!closeBtn) closeBtn = text("暂不").findOne(1500);
    if (!closeBtn) closeBtn = text("取消").findOne(1500);

    if (closeBtn && closeBtn.clickable()) {
        closeBtn.click();
        UI.humanDelay(500, 800);
    }
}

/**
 * 应用筛选条件
 */
function applyFilter(filterName) {
    let filterBtn = text(filterName).findOne(3000);
    if (!filterBtn) filterBtn = desc(filterName).findOne(2000);
    if (filterBtn && filterBtn.clickable()) {
        filterBtn.click();
        UI.humanDelay(2000, 3000);
        log("🔽 已应用筛选:", filterName);
    }
}

module.exports = {
    searchProduct: searchProduct,
};
