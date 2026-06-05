/**
 * Fold7 Agent — app framework regression tests.
 *
 * These tests cover the current architecture: app-level model configuration,
 * AI script generation, framework execution helpers, and runtime logging.
 */

require("./mock.js");

var assert = global._mockAssert;
var UIAutomator = require("../core/UIAutomator.js");
var ModelClient = require("../core/ModelClient.js");
var AppConfig = require("../core/AppConfig.js");
var Logger = require("../core/Logger.js");

var passed = 0;
var failed = 0;

function test(name, fn) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("▶️  测试:", name);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    assert.reset();
    try {
        fn();
        passed++;
        console.log("✅ 通过:", name);
    } catch (e) {
        failed++;
        console.log("❌ 失败:", name);
        console.log("   ", e.message);
    }
}

test("AppConfig 应提供默认模型配置", function () {
    var cfg = AppConfig.read();
    if (!cfg.kimi || !cfg.deepseek || !cfg.local) throw new Error("缺少模型提供商配置");
    if (cfg.maxSteps !== 15) throw new Error("默认最大步数错误: " + cfg.maxSteps);
});

test("AppConfig 应识别本地模型为可配置状态", function () {
    var cfg = AppConfig.defaults();
    cfg.provider = "local";
    if (!AppConfig.isConfigured(cfg)) throw new Error("本地模型配置应可用");
});

test("ModelClient.callModelWithHistory 应返回脚本响应文本", function () {
    assert.setModelResponses([
        {
            type: "script",
            description: "打开设置",
            steps: ["打开系统设置"],
            code: "(function(){ var UIAutomator = require('/sdcard/AutoX/fold7-agent/autojs-scripts/core/UIAutomator.js'); UIAutomator.executeCommand({ action: 'launch', target: '设置', delay_ms: 3000, reason: '打开设置' }); })();",
        },
    ]);
    var raw = ModelClient.callModelWithHistory([{ role: "user", content: "打开设置" }]);
    if (raw.indexOf('"type":"script"') < 0 && raw.indexOf('"type": "script"') < 0) {
        throw new Error("模型未返回脚本 JSON: " + raw);
    }
    if (raw.indexOf("UIAutomator") < 0) throw new Error("脚本缺少框架 API 引用");
});

test("UIAutomator.safeClick 应点击节点", function () {
    assert.setPage("settings");
    var ok = UIAutomator.safeClick("蓝牙", 3000);
    if (!ok) throw new Error("safeClick 返回 false");
    assert.actionContains("node_click", { text: "蓝牙" });
});

test("UIAutomator.safeInput 应在输入框输入文字", function () {
    assert.setPage("chat");
    var ok = UIAutomator.safeInput("发消息", "你好");
    if (!ok) throw new Error("safeInput 返回 false");
    assert.actionContains("node_setText", { text: "发消息", value: "你好" });
});

test("UIAutomator.executeCommand 应执行 launch", function () {
    assert.setPage("home");
    var cont = UIAutomator.executeCommand({
        action: "launch",
        target: "微信",
        delay_ms: 2000,
        reason: "打开微信",
    });
    if (cont !== true) throw new Error("launch 后应返回 true");
    assert.pageIs("wechat_home");
});

test("UIAutomator.executeCommand 应执行 done", function () {
    var cont = UIAutomator.executeCommand({
        action: "done",
        reason: "完成",
    });
    if (cont !== false) throw new Error("done 应返回 false 停止执行");
});

test("Logger.todayStats 应统计任务结束结果", function () {
    Logger.taskEnd("agent", true, "完成", 1);
    Logger.taskEnd("agent", false, "失败", 1);
    var stats = Logger.todayStats();
    if (stats.success < 1 || stats.failed < 1) {
        throw new Error("统计结果错误: " + JSON.stringify(stats));
    }
});

console.log("\n" + "═".repeat(40));
console.log("📊 测试报告");
console.log("═".repeat(40));
console.log("✅ 通过:", passed);
console.log("❌ 失败:", failed);
console.log("📈 总计:", passed + failed);

if (failed > 0) {
    console.log("\n⚠️  存在失败用例，请检查上方日志");
    process.exit(1);
}

console.log("\n✅ 所有新架构测试通过");
process.exit(0);
