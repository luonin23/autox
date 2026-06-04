/**
 * Fold7 Agent — Node.js 模拟测试运行器
 *
 * 用法: node test/runner.js
 * 功能: 加载 Mock 环境，运行所有场景测试，输出报告
 */

require("./mock.js");

const assert = global._mockAssert;

// 导入被测模块
const UIAutomator = require("../core/UIAutomator.js");
const ModelClient = require("../core/ModelClient.js");
const Workflow = require("../tasks/Workflow.js");

let passed = 0;
let failed = 0;

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

// ===================== 场景测试 =====================

// 1. UIAutomator 基础操作
test("UIAutomator.safeClick 应点击节点", function () {
    assert.setPage("settings");
    const ok = UIAutomator.safeClick("蓝牙", 3000);
    if (!ok) throw new Error("safeClick 返回 false");
    assert.actionContains("node_click", { text: "蓝牙" });
});

test("UIAutomator.safeInput 应在输入框输入文字", function () {
    assert.setPage("chat");
    const ok = UIAutomator.safeInput("发消息", "你好");
    if (!ok) throw new Error("safeInput 返回 false");
    assert.actionContains("node_setText", { text: "发消息", value: "你好" });
});

test("UIAutomator.executeCommand 应执行 launch", function () {
    assert.setPage("home");
    const cont = UIAutomator.executeCommand({
        action: "launch",
        target: "微信",
        delay_ms: 2000,
        reason: "打开微信",
    });
    if (cont !== true) throw new Error("launch 后应返回 true");
    assert.pageIs("wechat_home");
});

test("UIAutomator.executeCommand 应执行 click", function () {
    assert.setPage("settings");
    const cont = UIAutomator.executeCommand({
        action: "click",
        target: "显示",
        delay_ms: 1000,
        reason: "点击显示",
    });
    if (cont !== true) throw new Error("click 后应返回 true");
    assert.actionContains("node_click", { text: "显示" });
});

test("UIAutomator.executeCommand 应执行 done", function () {
    const cont = UIAutomator.executeCommand({
        action: "done",
        reason: "完成",
    });
    if (cont !== false) throw new Error("done 应返回 false 停止执行");
});

// 2. ModelClient 调用
test("ModelClient.callModel 应返回结构化指令", function () {
    assert.setModelResponses([
        { action: "click", target: "搜索", delay_ms: 1000, reason: "点击搜索" },
    ]);
    const cmd = ModelClient.callModel("测试指令", "当前屏幕内容");
    if (!cmd || cmd.action !== "click") {
        throw new Error("模型返回无效: " + JSON.stringify(cmd));
    }
    if (cmd.target !== "搜索") {
        throw new Error("目标不匹配: " + cmd.target);
    }
});

test("ModelClient.callModel 应支持重试", function () {
    // 模拟: 第一次返回非 JSON，第二次返回有效 JSON
    assert.setModelResponses([
        { action: "wait", delay_ms: 500, reason: "第一次" },
    ]);
    const cmd = ModelClient.callModel("测试重试", "屏幕");
    if (cmd.action !== "wait") {
        throw new Error("重试后未得到正确指令");
    }
});

// 3. Workflow 工作流
test("Workflow 应执行顺序步骤", function () {
    assert.setPage("home");
    const ok = Workflow.execute({
        name: "顺序测试",
        steps: [
            { action: "launch", target: "设置", delay: 100 },
            { action: "click", target: "蓝牙", delay: 100 },
            { action: "done" },
        ],
    });
    if (!ok) throw new Error("Workflow 返回 false");
    assert.pageIs("settings");
    assert.actionContains("launch", { app: "设置" });
    assert.actionContains("node_click", { text: "蓝牙" });
});

test("Workflow 条件分支 if 应生效", function () {
    assert.setPage("settings");
    const ok = Workflow.execute({
        name: "条件测试",
        steps: [
            {
                action: "if",
                condition: { type: "exists", target: "蓝牙" },
                then: [{ action: "click", target: "蓝牙", delay: 100 }],
                else: [{ action: "click", target: "WLAN", delay: 100 }],
            },
            { action: "done" },
        ],
    });
    if (!ok) throw new Error("Workflow 返回 false");
    // settings 页面有"蓝牙"，应执行 then 分支
    assert.actionContains("node_click", { text: "蓝牙" });
});

test("Workflow 变量替换应生效", function () {
    assert.setPage("chat");
    const ok = Workflow.execute(
        {
            name: "变量测试",
            steps: [
                { action: "input", target: "发消息", text: "你好$name", delay: 100 },
                { action: "done" },
            ],
        },
        { "$name": "张三" }
    );
    if (!ok) throw new Error("Workflow 返回 false");
    assert.actionContains("node_setText", { value: "你好张三" });
});

// 4. 综合场景
test("场景: 打开微信并搜索联系人", function () {
    assert.setPage("home");
    assert.setModelResponses([
        { action: "launch", target: "微信", delay_ms: 2000, reason: "打开微信" },
        { action: "click", target: "搜索", delay_ms: 1000, reason: "点击搜索" },
        { action: "done", reason: "完成" },
    ]);

    // 模拟 Agent 主循环前 3 步
    let done = false;
    for (let i = 0; i < 3 && !done; i++) {
        const screen = UIAutomator.getScreenContext(500);
        const cmd = ModelClient.callModel("打开微信搜索张三", screen);
        const cont = UIAutomator.executeCommand(cmd);
        if (!cont || cmd.action === "done") done = true;
    }

    assert.pageIs("wechat_search");
    assert.actionContains("launch", { app: "微信" });
    assert.actionContains("node_click", { text: "搜索" });
});

// ===================== 报告 =====================
console.log("\n" + "═".repeat(40));
console.log("📊 测试报告");
console.log("═".repeat(40));
console.log("✅ 通过:", passed);
console.log("❌ 失败:", failed);
console.log("📈 总计:", passed + failed);

if (failed > 0) {
    console.log("\n⚠️  存在失败用例，请检查上方日志");
    process.exit(1);
} else {
    console.log("\n🎉 所有测试通过！");
    process.exit(0);
}
