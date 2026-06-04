/**
 * 全局停止控制模块
 * 提供统一的音量键停止 + 停止标志检查
 */

let _STOPPED = false;
let _LISTENING = false;
let _KEY_LISTENER = null;

/**
 * 注册音量上键监听（只需调用一次）
 */
function setup() {
    if (_LISTENING) return;
    if (typeof events === "undefined") return;
    try {
        events.observeKey();
        _KEY_LISTENER = function () {
            toastLog("⏹️ 用户按音量上键，正在停止...");
            _STOPPED = true;
            if (typeof engines !== "undefined") {
                engines.stopAll();
            }
        };
        events.onKeyDown("volume_up", _KEY_LISTENER);
        _LISTENING = true;
    } catch (e) {
        log("⚠️ 音量键监听设置失败:", e.message);
    }
}

/**
 * 移除音量键监听（防止内存泄漏）
 */
function teardown() {
    if (!_LISTENING || typeof events === "undefined") return;
    try {
        if (_KEY_LISTENER) {
            events.removeAllKeyDownListeners("volume_up");
            _KEY_LISTENER = null;
        }
        _LISTENING = false;
    } catch (e) {
        log("⚠️ 音量键监听移除失败:", e.message);
    }
}

/**
 * 显示启动提示（只在首次调用时显示）
 */
function showHint() {
    if (typeof toast === "function") {
        toast("🔊 按【音量上键】可随时停止");
    }
}

/**
 * 检查是否已停止
 */
function isStopped() {
    return _STOPPED;
}

/**
 * 如果已停止则抛出异常（中断当前流程）
 */
function throwIfStopped() {
    if (_STOPPED) {
        throw new Error("SCRIPT_STOPPED_BY_USER");
    }
}

/**
 * 如果已停止则返回 true（用于循环条件）
 */
function check() {
    return _STOPPED;
}

/**
 * 带停止检查的睡眠
 */
function safeSleep(ms) {
    if (typeof sleep !== "function") return;
    const chunk = 500;
    let remaining = ms;
    while (remaining > 0 && !_STOPPED) {
        sleep(Math.min(chunk, remaining));
        remaining -= chunk;
    }
}

/**
 * 重置停止标志（测试用）
 */
function reset() {
    _STOPPED = false;
}

module.exports = {
    setup: setup,
    teardown: teardown,
    showHint: showHint,
    isStopped: isStopped,
    throwIfStopped: throwIfStopped,
    check: check,
    safeSleep: safeSleep,
    reset: reset,
};
