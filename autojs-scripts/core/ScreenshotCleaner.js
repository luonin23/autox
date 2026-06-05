/**
 * 截图自动清理器
 * 清理 /sdcard/fold7-agent/ 下过期的 debug 截图，保留最近 N 张
 */

var SCREENSHOT_DIR = "/sdcard/fold7-agent/";
var MAX_SCREENSHOTS = 50;     // 最多保留 50 张
var MAX_AGE_DAYS = 7;         // 超过 7 天的删除

/**
 * 执行清理
 */
function clean() {
    try {
        var dir = SCREENSHOT_DIR;
        if (!files.exists(dir)) return { cleaned: 0, kept: 0 };

        // AutoX.js 的 files.listDir 返回文件名数组
        var list = [];
        try {
            list = files.listDir(dir);
        } catch (e) {
            log("⚠️ 读取截图目录失败:", e.message);
            return { cleaned: 0, kept: 0, error: e.message };
        }

        // 筛选出 png/jpg 文件
        var screenshots = [];
        list.forEach(function (name) {
            if (name.match(/\.(png|jpg|jpeg)$/i)) {
                var path = dir + name;
                try {
                    var stat = files.stat(path);
                    screenshots.push({
                        name: name,
                        path: path,
                        time: stat.lastModified(),
                    });
                } catch (e) {
                    // 忽略无法 stat 的文件
                }
            }
        });

        if (screenshots.length === 0) return { cleaned: 0, kept: 0 };

        // 按时间倒序排列
        screenshots.sort(function (a, b) {
            return b.time - a.time;
        });

        var cleaned = 0;
        var now = Date.now();
        var maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

        screenshots.forEach(function (s, index) {
            // 超过数量限制或超过天数的删除
            if (index >= MAX_SCREENSHOTS || (now - s.time) > maxAge) {
                try {
                    files.remove(s.path);
                    cleaned++;
                    log("🗑️ 已清理截图:", s.name);
                } catch (e) {
                    log("⚠️ 删除截图失败:", s.name, e.message);
                }
            }
        });

        var kept = screenshots.length - cleaned;
        log("📸 截图清理完成: 保留 " + kept + " 张, 删除 " + cleaned + " 张");
        return { cleaned: cleaned, kept: kept };
    } catch (e) {
        log("❌ 截图清理异常:", e.message);
        return { cleaned: 0, kept: 0, error: e.message };
    }
}

module.exports = { clean: clean };
