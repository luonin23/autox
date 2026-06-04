/**
 * SemanticParser 单元测试
 * 用法: node test/semantic-test.js
 */

const SemanticParser = require("../core/SemanticParser.js");

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, msg) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(
            (msg || "断言失败") + "\n  期望: " + expectedStr + "\n  实际: " + actualStr
        );
    }
}

function test(name, fn) {
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

// ===================== 测试用例 =====================

// 1. 发消息

test("解析：给张三发你好", function () {
    const r = SemanticParser.parse("给张三发你好");
    assertEqual(r.intent, "send_message");
    assertEqual(r.app, "微信");
    assertEqual(r.target, "张三");
    assertEqual(r.content, "你好");
});

test("解析：打开微信给肖波发你好", function () {
    const r = SemanticParser.parse("打开微信给肖波发你好");
    assertEqual(r.intent, "send_message");
    assertEqual(r.app, "微信");
    assertEqual(r.target, "肖波");
    assertEqual(r.content, "你好");
});

test("解析：告诉李四说晚上一起吃饭", function () {
    const r = SemanticParser.parse("告诉李四说晚上一起吃饭");
    assertEqual(r.intent, "send_message");
    assertEqual(r.target, "李四");
    assertEqual(r.content, "晚上一起吃饭");
});

test("解析：给王五发送\"明天开会\"", function () {
    const r = SemanticParser.parse('给王五发送"明天开会"');
    assertEqual(r.intent, "send_message");
    assertEqual(r.target, "王五");
    assertEqual(r.content, "明天开会");
});

test("解析：跟赵六说生日快乐", function () {
    const r = SemanticParser.parse("跟赵六说生日快乐");
    assertEqual(r.intent, "send_message");
    assertEqual(r.target, "赵六");
    assertEqual(r.content, "生日快乐");
});

// 2. 打开应用

test("解析：打开钉钉", function () {
    const r = SemanticParser.parse("打开钉钉");
    assertEqual(r.intent, "launch_app");
    assertEqual(r.app, "钉钉");
});

test("解析：启动淘宝", function () {
    const r = SemanticParser.parse("启动淘宝");
    assertEqual(r.intent, "launch_app");
    assertEqual(r.app, "淘宝");
});

// 3. 打卡

test("解析：钉钉打卡", function () {
    const r = SemanticParser.parse("钉钉打卡");
    assertEqual(r.intent, "clock_in");
    assertEqual(r.app, "钉钉");
    assertEqual(r.target, "上班打卡");
});

test("解析：下班打卡", function () {
    const r = SemanticParser.parse("下班打卡");
    assertEqual(r.intent, "clock_in");
    assertEqual(r.target, "下班打卡");
});

// 4. 搜索

test("解析：在淘宝搜手机", function () {
    const r = SemanticParser.parse("在淘宝搜手机");
    assertEqual(r.intent, "search");
    assertEqual(r.app, "淘宝");
    assertEqual(r.target, "手机");
});

test("解析：搜索iPhone 16", function () {
    const r = SemanticParser.parse("搜索iPhone 16");
    assertEqual(r.intent, "search");
    assertEqual(r.target, "iPhone 16");
});

// 5. 设置

test("解析：打开WiFi", function () {
    const r = SemanticParser.parse("打开WiFi");
    assertEqual(r.intent, "system_setting");
    assertEqual(r.app, "设置");
    assertEqual(r.target, "WLAN");
    assertEqual(r.action, "open");
});

test("解析：调亮度到50", function () {
    const r = SemanticParser.parse("调亮度到50");
    assertEqual(r.intent, "set_brightness");
    assertEqual(r.level, 50);
});

// 6. 导航

test("解析：导航到天安门", function () {
    const r = SemanticParser.parse("导航到天安门");
    assertEqual(r.intent, "navigate");
    assertEqual(r.app, "高德地图");
    assertEqual(r.target, "天安门");
    assertEqual(r.mode, "drive");
});

test("解析：去公司怎么走", function () {
    const r = SemanticParser.parse("去公司怎么走");
    assertEqual(r.intent, "navigate");
    assertEqual(r.target, "公司");
});

// 7. 其他

test("解析：返回", function () {
    const r = SemanticParser.parse("返回");
    assertEqual(r.intent, "go_back");
});

test("解析：回主页", function () {
    const r = SemanticParser.parse("回主页");
    assertEqual(r.intent, "go_home");
});

// 8. 边界

test("解析：空字符串", function () {
    const r = SemanticParser.parse("");
    assertEqual(r.intent, "unknown");
});

test("解析：null", function () {
    const r = SemanticParser.parse(null);
    assertEqual(r.intent, "unknown");
});

// 9. 辅助函数

test("extractContactName：给张三发消息", function () {
    const r = SemanticParser.extractContactName("给张三发消息");
    assertEqual(r, "张三");
});

test("extractAppName：打开微信", function () {
    const r = SemanticParser.extractAppName("打开微信");
    assertEqual(r, "微信");
});

test("extractMessageContent：引号内容", function () {
    const r = SemanticParser.extractMessageContent('给张三发"你好啊"');
    assertEqual(r, "你好啊");
});

// ===================== 报告 =====================
console.log("\n" + "═".repeat(40));
console.log("📊 语义解析测试报告");
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
