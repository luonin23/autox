/**
 * 微信发消息任务（增强版）
 * 支持：通过 AutoX.js 无障碍服务操控微信
 * 特性：多种搜索回退策略、统一反检测延迟、发送确认
 */

const UI = require("../core/UIAutomator.js");

function sendWeChatMessage(contactName, message) {
    if (!contactName || !message) {
        toastLog("⚠️ 联系人或消息不能为空");
        return false;
    }

    toastLog("📱 开始给 " + contactName + " 发微信");

    // 1. 打开微信
    launchApp("微信");
    UI.humanDelay(2500, 3500);

    // 2. 确保在首页（处理可能的弹窗）
    handleWeChatPopup();

    // 3. 尝试首页搜索
    let searchSuccess = searchFromHome(contactName);

    // 4. 如果首页搜索失败，尝试通讯录搜索
    if (!searchSuccess) {
        log("🔄 首页搜索失败，尝试通讯录搜索");
        searchSuccess = searchFromContacts(contactName);
    }

    if (!searchSuccess) {
        toastLog("⚠️ 未找到联系人: " + contactName);
        UI.captureDebug("wechat_contact_not_found.png");
        return false;
    }

    UI.humanDelay(2000, 3000);

    // 5. 输入消息
    if (!inputChatMessage(message)) {
        toastLog("⚠️ 未找到聊天输入框");
        UI.captureDebug("wechat_input_not_found.png");
        return false;
    }

    // 6. 点击发送
    UI.humanDelay(500, 1000);
    if (clickSendButton()) {
        toastLog("✅ 消息已发送给 " + contactName);
        UI.humanDelay(1000, 1500);
        return true;
    } else {
        toastLog("⚠️ 未找到发送按钮");
        UI.captureDebug("wechat_send_not_found.png");
        return false;
    }
}

/**
 * 处理微信常见弹窗（更新提示、红包等）
 */
function handleWeChatPopup() {
    let ignoreBtn = text("忽略").findOne(2000);
    if (!ignoreBtn) ignoreBtn = text("取消").findOne(1000);
    if (!ignoreBtn) ignoreBtn = desc("关闭").findOne(1000);
    if (ignoreBtn && ignoreBtn.clickable()) {
        ignoreBtn.click();
        UI.humanDelay(500, 800);
    }
}

/**
 * 从微信首页搜索联系人
 */
function searchFromHome(contactName) {
    let searchBtn = text("搜索").findOne(3000);
    if (!searchBtn) searchBtn = desc("搜索").findOne(2000);
    if (!searchBtn) searchBtn = descContains("搜索").findOne(2000);

    if (searchBtn && searchBtn.clickable()) {
        searchBtn.click();
        UI.humanDelay(1000, 1500);
    } else {
        return false;
    }

    let inputNode = className("EditText").findOne(3000);
    if (!inputNode) inputNode = text("搜索").className("EditText").findOne(2000);
    if (inputNode) {
        inputNode.setText(contactName);
        UI.humanDelay(2000, 2500);
    } else {
        back();
        return false;
    }

    let contact = text(contactName).findOne(3000);
    if (!contact) contact = textContains(contactName).findOne(2000);
    if (contact && contact.clickable()) {
        contact.click();
        return true;
    }

    back();
    UI.humanDelay(500, 800);
    return false;
}

/**
 * 从通讯录搜索联系人
 */
function searchFromContacts(contactName) {
    let contactsTab = text("通讯录").findOne(3000);
    if (!contactsTab) contactsTab = desc("通讯录").findOne(2000);
    if (contactsTab && contactsTab.clickable()) {
        contactsTab.click();
        UI.humanDelay(1500, 2000);
    } else {
        return false;
    }

    let searchBtn = desc("搜索").findOne(3000);
    if (!searchBtn) searchBtn = text("搜索").findOne(2000);
    if (searchBtn && searchBtn.clickable()) {
        searchBtn.click();
        UI.humanDelay(1000, 1500);
    }

    let inputNode = className("EditText").findOne(3000);
    if (inputNode) {
        inputNode.setText(contactName);
        UI.humanDelay(2000, 2500);
    } else {
        back();
        return false;
    }

    let contact = text(contactName).findOne(3000);
    if (!contact) contact = textContains(contactName).findOne(2000);
    if (contact && contact.clickable()) {
        contact.click();

        // 进入个人资料页后点击"发消息"
        UI.humanDelay(1500, 2000);
        let msgBtn = text("发消息").findOne(3000);
        if (!msgBtn) msgBtn = desc("发消息").findOne(2000);
        if (msgBtn && msgBtn.clickable()) {
            msgBtn.click();
            return true;
        }
    }

    back();
    UI.humanDelay(500, 800);
    return false;
}

/**
 * 在聊天页输入消息
 */
function inputChatMessage(message) {
    let chatInput = className("EditText").findOne(3000);
    if (!chatInput) chatInput = desc("发消息").findOne(2000);
    if (!chatInput) chatInput = descContains("输入").findOne(2000);

    if (chatInput) {
        chatInput.click();
        UI.humanDelay(300, 600);
        chatInput.setText("");
        sleep(200);
        chatInput.setText(message);
        UI.humanDelay(200, 500);
        return true;
    }
    return false;
}

/**
 * 点击发送按钮
 */
function clickSendButton() {
    let sendBtn = text("发送").findOne(3000);
    if (sendBtn && sendBtn.clickable()) {
        sendBtn.click();
        return true;
    }
    // 有些微信版本发送按钮是 desc
    sendBtn = desc("发送").findOne(2000);
    if (sendBtn && sendBtn.clickable()) {
        sendBtn.click();
        return true;
    }
    return false;
}

module.exports = sendWeChatMessage;
