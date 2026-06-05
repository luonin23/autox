/**
 * UI 自动化封装 — 基于 AutoX.js AccessibilityService
 */
var UIAutomator = (function () {
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

        var cx = (x1 + x2) / 2 + controlOffset;
        var cy = (y1 + y2) / 2 + random(-50, 50);

        var steps = Math.max(Math.floor(duration / 16), 10);
        var path = [];

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var invT = 1 - t;
            // 二次贝塞尔曲线
            var bx = invT * invT * x1 + 2 * invT * t * cx + t * t * x2;
            var by = invT * invT * y1 + 2 * invT * t * cy + t * t * y2;
            path.push([bx, by]);
        }

        for (var j = 0; j < path.length - 1; j++) {
            var stepDur = Math.floor(duration / steps);
            swipe(path[j][0], path[j][1], path[j + 1][0], path[j + 1][1], stepDur);
        }
    }

    /**
     * 安全点击（支持文本或坐标）
     * @param {string|UiObject} target 节点文字、desc 或 UiObject
     * @param {number} timeout 查找超时(ms)
     */
    function safeClick(target, timeout) {
        timeout = timeout || 5000;
        var node = null;

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
            var ok = node.click();
            humanDelay(300, 800);
            return ok;
        }

        log("未找到可点击节点:", target);
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
        var node = null;

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
            var bounds = node.bounds();
            var cx = bounds.centerX();
            var cy = bounds.centerY();
            press(cx, cy, duration);
            humanDelay(300, 600);
            return true;
        }

        log("未找到可长按节点:", target);
        return false;
    }

    /**
     * 安全输入文字
     * @param {string} target 输入框文字/desc
     * @param {string} content 要输入的内容
     */
    function safeInput(target, content) {
        var node = text(target).findOne(5000);
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

        log("未找到输入框:", target);
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

        var nodes = classNameContains("").find();
        var texts = [];

        nodes.forEach(function (n) {
            var t = n.text() || n.desc() || "";
            var trimmed = t.trim();
            // 过滤掉无意义内容
            if (!trimmed || trimmed.length > 80) return;
            if (trimmed.match(/^[\d\s\W]+$/)) return; // 纯数字符号
            if (trimmed.indexOf("android.widget.") === 0) return;

            var entry = trimmed;
            if (includeBounds) {
                var b = n.bounds();
                entry += " [" + b.centerX() + "," + b.centerY() + "]";
            }
            texts.push(entry);
        });

        // 去重
        var unique = [];
        var seen = {};
        texts.forEach(function (item) {
            var key = item.split(" [")[0]; // 去重时不看坐标
            if (!seen[key]) {
                seen[key] = true;
                unique.push(item);
            }
        });

        var result = unique.join(" | ");
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
            var path = "/sdcard/fold7-agent/" + (filename || "debug_" + Date.now() + ".png");
            files.createWithDirs(path);
            captureScreen(path);
            log("截图已保存:", path);
            return path;
        } catch (e) {
            log("截图失败:", e.message);
            return null;
        }
    }

    function goHome(delayMs) {
        try {
            var intent = new android.content.Intent(android.content.Intent.ACTION_MAIN);
            intent.addCategory(android.content.Intent.CATEGORY_HOME);
            intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            humanDelay(delayMs || 800);
            return true;
        } catch (e) {
            try {
                shell("input keyevent KEYCODE_HOME", false);
                humanDelay(delayMs || 800);
                return true;
            } catch (e2) {
                try {
                    home();
                    humanDelay(delayMs || 800);
                    return true;
                } catch (e3) {
                    log("返回桌面失败:", e3.message);
                }
            }
        }
        return false;
    }

    function launchTarget(target, delayMs) {
        var name = String(target || "").trim();
        try {
            if (name === "设置" || name.toLowerCase() === "settings" || name.indexOf("系统设置") >= 0) {
                var intent = new android.content.Intent(android.provider.Settings.ACTION_SETTINGS);
                intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                humanDelay(delayMs || 2000);
                return true;
            }
        } catch (e0) {}

        try {
            if (typeof app !== "undefined" && app.getPackageName && app.launchPackage) {
                var pkg = app.getPackageName(name);
                if (pkg) {
                    app.launchPackage(pkg);
                    humanDelay(delayMs || 2000);
                    return true;
                }
            }
        } catch (e1) {}

        try {
            launchApp(name);
            humanDelay(delayMs || 2000);
            return true;
        } catch (e2) {
            log("启动应用失败:", name, e2.message);
        }
        return false;
    }

    function goBack(delayMs) {
        try {
            shell("input keyevent KEYCODE_BACK", false);
            humanDelay(delayMs || 800);
            return true;
        } catch (e) {
            try {
                back();
                humanDelay(delayMs || 800);
                return true;
            } catch (e2) {
                log("返回失败:", e2.message);
            }
        }
        return false;
    }

    /**
     * 执行模型返回的指令
     * @param {object} cmd { action, target, text, delay_ms, reason }
     */
    function executeCommand(cmd) {
        if (!cmd || !cmd.action) {
            log("无效指令对象:", JSON.stringify(cmd));
            return false;
        }

        log("执行:", cmd.action, cmd.target || "", cmd.reason || "");
        toast(cmd.reason || cmd.action);

        switch (cmd.action) {
            case "launch":
                launchTarget(cmd.target, cmd.delay_ms || 2000);
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
                var dir = cmd.target;
                var w = device.width;
                var h = device.height;
                var cx1 = w / 2;
                var cy1 = h / 2;
                if (dir === "up") {
                    bezierSwipe(cx1, cy1 + 400, cx1, cy1 - 400, 400);
                } else if (dir === "down") {
                    bezierSwipe(cx1, cy1 - 400, cx1, cy1 + 400, 400);
                } else if (dir === "left") {
                    bezierSwipe(cx1 + 400, cy1, cx1 - 400, cy1, 400);
                } else if (dir === "right") {
                    bezierSwipe(cx1 - 400, cy1, cx1 + 400, cy1, 400);
                } else {
                    log("未知滑动方向:", dir);
                }
                humanDelay(cmd.delay_ms || 1000);
                break;
            }
            case "back":
                goBack(cmd.delay_ms || 800);
                break;
            case "home":
                goHome(cmd.delay_ms || 800);
                break;
            case "wait":
                humanDelay(cmd.delay_ms || 1000);
                break;
            case "done":
                toastLog("任务完成");
                return false; // 停止执行链
            default:
                log("未知 action:", cmd.action);
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
        launchTarget: launchTarget,
        goHome: goHome,
        goBack: goBack,
        executeCommand: executeCommand,
    };
})();

module.exports = UIAutomator;
