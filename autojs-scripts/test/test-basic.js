/**
 * 基础 API 验证脚本（不依赖外部模块）
 * 直接在模拟器运行，验证无障碍服务 + 基础操作
 * 结果写入 /sdcard/fold7-agent/test-result.txt
 */

var results = [];
var passed = 0;
var failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        results.push("✅ 通过: " + name);
    } catch (e) {
        failed++;
        results.push("❌ 失败: " + name + " — " + e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || "断言失败");
}

// ========== 测试 1: 无障碍服务 ==========
test("无障碍服务已连接", function () {
    assert(auto.service != null, "auto.service 为 null");
});

// ========== 测试 2: 基础设备信息 ==========
test("设备信息可读", function () {
    assert(device.width > 0, "屏幕宽度无效");
    assert(device.height > 0, "屏幕高度无效");
    results.push("   屏幕: " + device.width + "x" + device.height);
});

// ========== 测试 3: 打开 Chrome ==========
test("打开 Chrome 应用", function () {
    launchApp("Chrome");
    sleep(3000);
    var pkg = currentPackage();
    assert(pkg === "com.android.chrome" || pkg === "com.google.android.apps.chrome", "未进入 Chrome, 当前: " + pkg);
    results.push("   当前包名: " + pkg);
});

// ========== 测试 4: 屏幕文字读取 ==========
test("读取屏幕节点文字", function () {
    var nodes = classNameContains("").find();
    assert(nodes.size() > 0, "未找到任何节点");
    var text = "";
    nodes.forEach(function (n) {
        var t = n.text() || n.desc() || "";
        if (t.trim()) text += t + " | ";
    });
    assert(text.length > 0, "屏幕文字为空");
    results.push("   屏幕文字片段: " + text.substring(0, 80));
});

// ========== 测试 5: 返回操作 ==========
test("返回操作", function () {
    back();
    sleep(1000);
    results.push("   返回完成");
});

// ========== 测试 6: 打开设置 ==========
test("打开系统设置", function () {
    launchApp("Settings");
    sleep(2000);
    var pkg = currentPackage();
    assert(pkg === "com.android.settings", "未进入设置, 当前: " + pkg);
    results.push("   当前包名: " + pkg);
});

// ========== 测试 7: 查找并点击 Display ==========
test("查找 Display 节点", function () {
    var node = text("Display").findOne(5000);
    if (!node) node = desc("Display").findOne(3000);
    assert(node != null, "未找到 Display 节点");
    results.push("   找到节点: " + (node.text() || node.desc()));
});

// ========== 测试 8: 回到桌面 ==========
test("回到桌面", function () {
    home();
    sleep(1000);
    results.push("   已回到桌面");
});

// ========== 测试 9: toast 输出 ==========
test("Toast 输出", function () {
    toast("🎉 Fold7 Agent 基础测试");
    sleep(500);
});

// ========== 报告 ==========
var report = [];
report.push("════════════════════════════════════════");
report.push("📊 基础 API 测试报告");
report.push("════════════════════════════════════════");
report.push("✅ 通过: " + passed);
report.push("❌ 失败: " + failed);
report.push("📈 总计: " + (passed + failed));
report.push("");
for (var i = 0; i < results.length; i++) {
    report.push(results[i]);
}
if (failed === 0) {
    report.push("");
    report.push("🎉 所有基础测试通过！");
} else {
    report.push("");
    report.push("⚠️ 存在失败用例");
}

var reportText = report.join("\n");
log(reportText);

// 同时写入文件
try {
    files.createWithDirs("/sdcard/fold7-agent/test-result.txt");
    files.write("/sdcard/fold7-agent/test-result.txt", reportText);
} catch (e) {
    log("写入文件失败: " + e.message);
}

toastLog("测试完成: " + passed + " 通过, " + failed + " 失败");
