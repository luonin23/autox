/**
 * 模拟器环境验证脚本
 * 用于在真机/模拟器上快速验证 AutoX.js 环境是否正常
 */

// 1. 基础信息
toast("🧪 Fold7 Agent 模拟器测试开始");
console.log("设备型号:", device.model);
console.log("屏幕尺寸:", device.width, "x", device.height);
console.log("Android 版本:", device.release);

// 2. 无障碍服务检测
if (auto.service) {
    toast("✅ 无障碍服务已开启");
    console.log("无障碍服务: 已启用");
} else {
    toast("❌ 无障碍服务未开启");
    console.log("无障碍服务: 未启用");
}

// 3. 基础 UI 操作测试
sleep(1000);
home();
sleep(500);

// 4. 尝试读取当前屏幕
try {
    let nodes = classNameContains("").find();
    let texts = [];
    nodes.forEach(function (n) {
        let t = n.text() || n.desc() || "";
        if (t.trim() && t.length < 50) texts.push(t.trim());
    });
    console.log("屏幕节点数:", nodes.length);
    console.log("屏幕文字:", texts.slice(0, 10).join(" | "));
    toast("📱 成功读取屏幕节点: " + nodes.length + " 个");
} catch (e) {
    toast("⚠️ 读取屏幕失败: " + e.message);
    console.log("读取屏幕错误:", e.message);
}

// 5. 文件读写测试
try {
    let testPath = "/sdcard/fold7-agent/test-write.txt";
    files.createWithDirs(testPath);
    files.write(testPath, "Fold7 Agent 模拟器测试成功\n");
    let content = files.read(testPath);
    console.log("文件读写测试:", content.trim());
    toast("✅ 文件读写正常");
} catch (e) {
    toast("⚠️ 文件读写失败: " + e.message);
}

// 6. HTTP 请求测试（可选）
try {
    let res = http.get("https://api.moonshot.cn");
    console.log("HTTP 测试状态码:", res.statusCode);
    toast("🌐 HTTP 网络正常");
} catch (e) {
    toast("⚠️ HTTP 测试失败: " + e.message);
}

toast("🎉 模拟器测试完成，请查看日志");
console.log("=== 测试结束 ===");
