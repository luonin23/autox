/**
 * 原生系统 App 测试脚本
 * 在 Google 原生系统模拟器上验证核心功能
 */

const UI = require("../core/UIAutomator.js");
const StopHelper = require("../core/StopHelper.js");
const SemanticParser = require("../core/SemanticParser.js");
const TaskPlanner = require("../core/TaskPlanner.js");

// 注册停止快捷键
StopHelper.setup();

let testResults = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    log("▶️ 测试: " + name);
    try {
        fn();
        passed++;
        testResults.push({ name: name, status: "✅ 通过" });
        log("✅ 通过: " + name);
    } catch (e) {
        failed++;
        testResults.push({ name: name, status: "❌ 失败: " + e.message });
        log("❌ 失败: " + name + " — " + e.message);
    }
    sleep(500);
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || "断言失败");
}

// ===================== 测试开始 =====================

test("无障碍服务已启用", function () {
    assert(auto.service != null, "无障碍服务未启用");
    log("   服务状态: 已连接");
});

test("语义解析 — 打开设置", function () {
    const r = SemanticParser.parse("打开设置");
    assert(r.intent === "launch_app", "意图应为 launch_app，实际: " + r.intent);
    assert(r.app === "设置", "应用应为 设置，实际: " + r.app);
    log("   解析结果: " + JSON.stringify(r));
});

test("语义解析 — 给张三发消息", function () {
    const r = SemanticParser.parse("给张三发微信说你好");
    assert(r.intent === "send_message", "意图应为 send_message");
    assert(r.target === "张三", "联系人应为 张三");
    assert(r.content === "你好", "内容应为 你好");
    log("   解析结果: " + JSON.stringify(r));
});

test("语义解析 — 调亮度", function () {
    const r = SemanticParser.parse("把亮度调到80");
    assert(r.intent === "set_brightness", "意图应为 set_brightness");
    assert(r.level === 80, "亮度值应为 80");
    log("   解析结果: " + JSON.stringify(r));
});

test("任务规划 — 打开应用", function () {
    const intention = { intent: "launch_app", app: "Chrome" };
    const steps = TaskPlanner.plan(intention);
    assert(steps.length >= 2, "步骤数应 >= 2");
    assert(steps[0].action === "launch", "第一步应为 launch");
    assert(steps[steps.length - 1].action === "done", "最后一步应为 done");
    log("   计划步骤: " + steps.length + " 步");
    steps.forEach(function (s, i) {
        log("     步骤 " + (i + 1) + ": [" + s.action + "] " + s.reason);
    });
});

test("UIAutomator — 打开 Chrome 并截图", function () {
    launchApp("Chrome");
    UI.humanDelay(3000, 4000);
    if (StopHelper.check()) return;

    const path = UI.captureDebug("test_chrome.png");
    assert(path != null, "截图失败");
    log("   截图已保存: " + path);
});

test("UIAutomator — 获取屏幕上下文", function () {
    const ctx = UI.getScreenContext(500);
    assert(ctx && ctx.length > 0, "屏幕上下文为空");
    log("   屏幕内容片段: " + ctx.substring(0, 100));
});

test("UIAutomator — 返回 + 主页", function () {
    back();
    UI.humanDelay(800, 1200);
    home();
    UI.humanDelay(800, 1200);
    log("   返回和主页操作完成");
});

test("任务规划器 — 发消息完整流程", function () {
    const intention = {
        intent: "send_message",
        app: "微信",
        target: "测试联系人",
        content: "测试消息",
    };
    const steps = TaskPlanner.plan(intention);
    assert(steps.length >= 6, "发消息步骤数应 >= 6，实际: " + steps.length);
    log("   生成 " + steps.length + " 个步骤");
});

test("停止机制 — 检查标志", function () {
    assert(StopHelper.isStopped() === false, "初始状态不应为已停止");
    log("   停止标志正常");
});

// ===================== 测试报告 =====================
sleep(500);
log("");
log("════════════════════════════════════════");
log("📊 模拟器原生系统测试报告");
log("════════════════════════════════════════");
log("✅ 通过: " + passed);
log("❌ 失败: " + failed);
log("📈 总计: " + (passed + failed));

testResults.forEach(function (r) {
    log("   " + r.status + " — " + r.name);
});

if (failed === 0) {
    log("");
    log("🎉 所有测试通过！");
} else {
    log("");
    log("⚠️ 存在失败用例，请检查上方日志");
}

toastLog("测试完成: " + passed + " 通过, " + failed + " 失败");
