/**
 * 执行历史查看器
 * 在 AutoX.js 中运行此脚本，查看最近任务记录和今日统计
 */

const Logger = require("./core/Logger.js");

const records = Logger.readRecent(50);
const stats = Logger.todayStats();

if (typeof ui === "undefined") {
    // Node.js / 终端模式
    console.log("═══════════════════════════════════════");
    console.log("📊 今日统计:", stats.date);
    console.log("   ✅ 成功:", stats.success);
    console.log("   ❌ 失败:", stats.failed);
    console.log("═══════════════════════════════════════");
    console.log("📋 最近 " + records.length + " 条记录:");
    records.slice().reverse().forEach(function (r, i) {
        const time = r.timestamp ? r.timestamp.substring(11, 19) : "?";
        let icon = "📝";
        if (r.event === "task_start") icon = "🚀";
        if (r.event === "task_end") icon = r.success ? "✅" : "❌";
        if (r.event === "error") icon = "💥";
        console.log("  " + icon + " [" + time + "] " + (r.event || "unknown") + " | " + JSON.stringify(r).substring(0, 120));
    });
    console.log("═══════════════════════════════════════");
} else {
    // AutoX.js UI 模式
    let listHtml = "";
    records.slice().reverse().forEach(function (r) {
        const time = r.timestamp ? r.timestamp.substring(11, 19) : "?";
        let color = "#333";
        let icon = "📝";
        let summary = r.event || "unknown";
        if (r.event === "task_start") {
            icon = "🚀";
            summary = "开始: " + (r.instruction || r.type || "");
        } else if (r.event === "task_end") {
            icon = r.success ? "✅" : "❌";
            color = r.success ? "#27ae60" : "#e74c3c";
            summary = (r.success ? "成功" : "失败") + " | " + (r.message || "");
        } else if (r.event === "error") {
            icon = "💥";
            color = "#e74c3c";
            summary = "错误: " + (r.error || "");
        } else if (r.event === "step") {
            icon = "▶️";
            summary = "步骤" + r.stepIndex + ": " + r.action + (r.target ? " → " + r.target : "");
        }
        listHtml +=
            '<card cardBackgroundColor="#f8f9fa" cardCornerRadius="8" cardElevation="2" margin="4">' +
            '<vertical padding="8">' +
            '<text text="' + icon + " [" + time + "] " + summary.replace(/"/g, "'") + '" textSize="13sp" textColor="' + color + '"/>' +
            '</vertical></card>';
    });

    ui.layout(
        '<vertical padding="12">' +
        '<text text="📊 Fold7 Agent 执行历史" textSize="22sp" textColor="#222" gravity="center" marginBottom="8"/>' +
        '<card cardBackgroundColor="#e8f5e9" cardCornerRadius="8" cardElevation="2" margin="4">' +
        '<horizontal padding="12" gravity="center">' +
        '<text text="📅 ' + stats.date + '" textSize="14sp" textColor="#333" w="80"/>' +
        '<text text="✅ ' + stats.success + '" textSize="16sp" textColor="#27ae60" marginLeft="16" w="50"/>' +
        '<text text="❌ ' + stats.failed + '" textSize="16sp" textColor="#e74c3c" marginLeft="8" w="50"/>' +
        '</horizontal></card>' +
        '<scroll>' +
        '<vertical>' + listHtml + '</vertical>' +
        '</scroll>' +
        '<button id="btnClose" text="关闭" w="200" layout_gravity="center" marginTop="8"/>' +
        '</vertical>'
    );

    ui.statusBarColor("#ffffff");
    ui.btnClose.click(function () {
        ui.finish();
    });
}
