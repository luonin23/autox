/**
 * 系统设置类任务
 * 如：开关 WiFi、蓝牙、调节亮度、打开设置页等
 */

/**
 * 打开系统设置中的指定页面
 * @param {string} page 设置页面关键词
 */
function openSettings(page) {
    const settingPages = {
        wifi: "android.settings.WIFI_SETTINGS",
        bluetooth: "android.settings.BLUETOOTH_SETTINGS",
        display: "android.settings.DISPLAY_SETTINGS",
        sound: "android.settings.SOUND_SETTINGS",
        location: "android.settings.LOCATION_SOURCE_SETTINGS",
        battery: "android.settings.BATTERY_SAVER_SETTINGS",
        application: "android.settings.APPLICATION_SETTINGS",
        security: "android.settings.SECURITY_SETTINGS",
    };

    const action = settingPages[page.toLowerCase()];
    if (action) {
        app.startActivity({
            action: action,
        });
        toastLog("🔧 已打开设置: " + page);
        return true;
    } else {
        // 通用搜索方式
        launchApp("设置");
        sleep(2000);
        let searchBtn = desc("搜索设置").findOne(3000);
        if (!searchBtn) searchBtn = text("搜索").findOne(2000);
        if (searchBtn && searchBtn.clickable()) {
            searchBtn.click();
            sleep(1000);
            let input = className("EditText").findOne(2000);
            if (input) {
                input.setText(page);
                sleep(2000);
                return true;
            }
        }
    }
    return false;
}

/**
 * 调节屏幕亮度（需要修改系统设置权限）
 * @param {number} level 0-255
 */
function setBrightness(level) {
    level = Math.max(0, Math.min(255, level));
    try {
        device.setBrightnessMode(0); // 手动模式
        device.setBrightness(level);
        toastLog("🔆 亮度已调节至: " + level);
        return true;
    } catch (e) {
        toastLog("⚠️ 调节亮度失败: " + e.message);
        return false;
    }
}

/**
 * 开关 WiFi（需 Root 或 Shizuku，否则只打开设置页）
 */
function toggleWifi(enable) {
    try {
        if (typeof enable === "boolean") {
            wifiManager.setWifiEnabled(enable);
            toastLog((enable ? "📶 WiFi 已开启" : "📴 WiFi 已关闭"));
        } else {
            openSettings("wifi");
        }
        return true;
    } catch (e) {
        toastLog("⚠️ 无法直接控制 WiFi，已打开设置页");
        openSettings("wifi");
        return false;
    }
}

/**
 * 锁屏（需设备管理器权限）
 */
function lockScreen() {
    try {
        device.lockScreen();
        toastLog("🔒 屏幕已锁定");
        return true;
    } catch (e) {
        toastLog("⚠️ 锁屏失败: " + e.message);
        return false;
    }
}

module.exports = {
    openSettings: openSettings,
    setBrightness: setBrightness,
    toggleWifi: toggleWifi,
    lockScreen: lockScreen,
};
