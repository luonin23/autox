/**
 * UI 自动化封装 — 基于 AutoX.js AccessibilityService
 */
const UIAutomator = (function () {
    /**
     * 随机延迟（防检测）
     */
    function humanDelay(min, max) {
        min = min || 500;
        max = max || 2000;
        sleep(random(min, max));
    }

    /**
     * 贝塞尔曲线滑动（模拟真人手势，防检测）
     * @param {number} x1 起点 X
     * @param {number} y1 起点 Y
     * @param {number} x2 终点 X
     * @param {number} y2 终点 Y
     * @param {number} duration 总时长(ms)
     * @param {number} controlOffset 控制点偏移量（曲率）
     */
    function bezierSwipe(x1, y1, x2, y2, duration, controlOffset) {
        duration = duration || 300;
        controlOffset = controlOffset || random(-100, 100);

        const cx = (x1 + x2) / 2 + controlOffset;
        const cy = (y1 + y2) / 2 + random(-50, 50);

        const steps = Math.max(Math.floor(duration / 16), 10);
        const path = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const invT = 1 - t;
            // 二次贝塞尔曲线
            const bx = invT * invT * x1 + 2 * invT * t * cx + t * t * x2;
            const by = invT * invT * y1 + 2 * invT * t * cy + t * t * y2;
            path.push([bx, by]);
        }

        // 使用 gesture 执行路径（比 swipe 更自然）
        const gestureArgs = [duration].concat(path.flat());
        // AutoX.js 的 gesture 需要展开参数
        // 由于参数数量不确定，这里拆成每段小滑动来模拟
        for (let i = 0; i < path.length - 1; i++) {
            const stepDur = Math.floor(duration / steps);
            swipe(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], stepDur);
        }
    }

    /**
     * 安全点击（支持文本或坐标）
     * @param {string|UiObject} target 节点文字、desc 或 UiObject
     * @param {number} timeout 查找超时(ms)
     */
    function safeClick(target, timeout) {
        timeout = timeout || 5000;
        let node = null;

        if (typeof target === "string") {
            // 先按 text 查找，再按 desc 查找，再按包含文字查找
            node = text(target).findOne(timeout);
            if (!node) node = desc(target).findOne(timeout);
            if (!node) node = textContains(target).findOne(timeout);
            if (!node) node = textStartsWith(target).findOne(timeout);
        } else if (target && target.clickable) {
            node = target;
        }

        if (node && node.clickable()) {
            humanDelay(200, 600);
            const ok = node.click();
            humanDelay(300, 800);
            return ok;
        }

        log("⚠️ 未找到可点击节点:", target);
        return false;
    }

    /**
     * 长按（支持文本或坐标）
     * @param {string|UiObject} target
     * @param {number} duration 长按时长(ms)
     * @param {number} timeout 查找超时(ms)
     */
    function safeLongClick(target, duration, timeout) {
        duration = duration || 1000;
        timeout = timeout || 5000;
        let node = null;

        if (typeof target === "string") {
            node = text(target).findOne(timeout);
            if (!node) node = desc(target).findOne(timeout);
        } else if (target && target.longClickable) {
            node = target;
        }

        if (node && node.longClickable && node.longClick()) {
            sleep(duration);
            humanDelay(300, 600);
            return true;
        }

        // 回退：用坐标长按
        if (node) {
            const bounds = node.bounds();
            const cx = bounds.centerX();
            const cy = bounds.centerY();
            press(cx, cy, duration);
            humanDelay(300, 600);
            return true;
        }

        log("⚠️ 未找到可长按节点:", target);
        return false;
    }

    /**
     * 安全输入文字
     * @param {string} target 输入框文字/desc
     * @param {string} content 要输入的内容
     */
    function safeInput(target, content) {
        let node = text(target).findOne(5000);
        if (!node) node = desc(target).findOne(3000);
        if (!node) node = className("EditText").findOne(3000);

        if (node) {
            node.click();
            humanDelay(300, 600);
            // 先清空再输入更稳定
            node.setText("");
            sleep(200);
            node.setText(content);
            humanDelay(200, 500);
            return true;
        }

        log("⚠️ 未找到输入框:", target);
        return false;
    }

    /**
     * 获取当前屏幕文字摘要（用于传给模型）
     * @param {number} maxChars 最大字符数
     * @param {boolean} includeBounds 是否包含节点位置（帮助模型定位）
     */
    function getScreenContext(maxChars, includeBounds) {
        maxChars = maxChars || 2000;
        includeBounds = includeBounds || false;

        const nodes = classNameContains("").find();
        let texts = [];

        nodes.forEach(function (n) {
            const t = n.text() || n.desc() || "";
            const trimmed = t.trim();
            // 过滤掉无意义内容
            if (!trimmed || trimmed.length > 80) return;
            if (trimmed.match(/^[\d\s\W]+$/)) return; // 纯数字符号
            if (trimmed.indexOf("android.widget.") === 0) return;

            let entry = trimmed;
            if (includeBounds) {
                const b = n.bounds();
                entry += ` [${b.centerX()},${b.centerY()}]`;
            }
            texts.push(entry);
        });

        // 去重
        const unique = [];
        const seen = {};
        texts.forEach(function (item) {
            const key = item.split(" [")[0]; // 去重时不看坐标
            if (!seen[key]) {
                seen[key] = true;
                unique.push(item);
            }
        });

        let result = unique.join(" | ");
        if (result.length > maxChars) {
            result = result.substring(0, maxChars) + "...";
        }
        return result || "（无法读取屏幕内容）";
    }

    /**
     * 截图并保存（用于调试）
     * @param {string} filename 文件名（不含路径）
 */
    function captureDebug(filename) {
        try {
            const path = "/sdcard/fold7-agent/" + (filename || "debug_" + Date.now() + ".png");
            files.createWithDirs(path);
            captureScreen(path);
            log("📸 截图已保存:", path);
            return path;
        } catch (e) {
            log("⚠️ 截图失败:", e.message);
            return null;
        }
    }

    /**
     * 执行模型返回的指令
     * @param {object} cmd { action, target, text, delay_ms, reason }
     */
    function executeCommand(cmd) {
        if (!cmd || !cmd.action) {
            log("⚠️ 无效指令对象:", JSON.stringify(cmd));
            return false;
        }

        log("▶️ 执行:", cmd.action, cmd.target || "", cmd.reason || "");
        toast(cmd.reason || cmd.action);

        switch (cmd.action) {
            case "launch":
                launchApp(cmd.target);
                humanDelay(cmd.delay_ms || 2000);
                break;
            case "click":
                safeClick(cmd.target);
                humanDelay(cmd.delay_ms || 1000);
                break;
            case "longclick":
                safeLongClick(cmd.target);
                humanDelay(cmd.delay_ms || 1500);
                break;
            case "input":
                safeInput(cmd.target, cmd.text);
                humanDelay(cmd.delay_ms || 800);
                break;
            case "swipe": {
                const dir = cmd.target;
                const w = device.width;
                const h = device.height;
                const cx = w / 2;
                const cy = h / 2;
                if (dir === "up") {
                    bezierSwipe(cx, cy + 400, cx, cy - 400, 400);
                } else if (dir === "down") {
                    bezierSwipe(cx, cy - 400, cx, cy + 400, 400);
                } else if (dir === "left") {
                    bezierSwipe(cx + 400, cy, cx - 400, cy, 400);
                } else if (dir === "right") {
                    bezierSwipe(cx - 400, cy, cx + 400, cy, 400);
                } else {
                    log("⚠️ 未知滑动方向:", dir);
                }
                humanDelay(cmd.delay_ms || 1000);
                break;
            }
            case "back":
                back();
                humanDelay(cmd.delay_ms || 800);
                break;
            case "home":
                home();
                humanDelay(cmd.delay_ms || 800);
                break;
            case "wait":
                humanDelay(cmd.delay_ms || 1000);
                break;
            case "done":
                toastLog("✅ 任务完成");
                return false; // 停止执行链
            default:
                log("⚠️ 未知 action:", cmd.action);
        }
        return true; // 继续下一步
    }

    return {
        humanDelay: humanDelay,
        bezierSwipe: bezierSwipe,
        safeClick: safeClick,
        safeLongClick: safeLongClick,
        safeInput: safeInput,
        getScreenContext: getScreenContext,
        captureDebug: captureDebug,
        executeCommand: executeCommand,
    };
})();

module.exports = UIAutomator;
