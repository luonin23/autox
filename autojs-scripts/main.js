/**
 * Fold7 Agent — 完整应用框架（v2）
 *
 * 这是一个运行在 AutoX.js 中的完整 APP，包含：
 *   🏠 Home     — 快速入口、欢迎、常用指令
 *   💬 Chat     — AI 对话生成脚本 → 执行 → 自动调试
 *   📂 Manage   — 管理已保存的脚本
 *   📖 Docs     — 编码规范、应用知识、帮助文档
 *   ⚙️ Settings — 模型配置（Kimi / DeepSeek / Local）
 *
 * 底部 Tab 导航切换，所有页面在同一 ui.layout() 中定义。
 */
"ui";

// 调试：确认脚本开始执行
toast("Fold7 Agent 启动中...");

(function () {

// ===================== 模块导入 =====================
var ChatEngine = require("./agent/ChatEngine.js");
var AppConfig = require("./core/AppConfig.js");
var ModelClient = require("./core/ModelClient.js");
var Logger = require("./core/Logger.js");
var ScreenshotCleaner = require("./core/ScreenshotCleaner.js");

// 加载配置
var CONFIG = AppConfig.read();
var HAS_MODEL_CONFIG = AppConfig.isConfigured(CONFIG);

// ===================== 常量 =====================
var SAVE_DIR = "/sdcard/AutoX/fold7-agent/scripts/";
var NAV_ACTIVE_COLOR = "#1976d2";
var NAV_INACTIVE_COLOR = "#666666";
var NAV_ACTIVE_BG = "#e3f2fd";
var NAV_INACTIVE_BG = "#ffffff";

// ===================== 应用框架布局 =====================
ui.layout(
    <frame>
        <vertical>
            <!-- 标题栏 -->
            <horizontal bg="#1976d2" padding="12 16" gravity="center_vertical">
                <text text="Fold7 Agent" textSize="20sp" textColor="#ffffff" textStyle="bold"/>
                <text text="AI 自动化框架" textSize="12sp" textColor="#bbdefb" marginLeft="8" layout_gravity="center_vertical"/>
            </horizontal>

            <!-- 页面容器 -->
            <frame id="pageContainer" layout_weight="1" bg="#f5f5f5">

                <!-- ========== 🏠 Home 页 ========== -->
                <vertical id="pageHome" visibility="visible" padding="16">
                    <scroll>
                        <vertical>
                            <text text="欢迎使用 Fold7 Agent" textSize="22sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                            <text text="通过 AI 对话生成 Android 自动化脚本" textSize="14sp" textColor="#666666" marginBottom="20"/>

                            <!-- 快速入口卡片 -->
                            <vertical bg="#ffffff" padding="16" marginBottom="12">
                                <text text="🚀 快速开始" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="12"/>
                                <text text="点击底部 💬 Chat 标签，输入自然语言指令：" textSize="13sp" textColor="#666666" marginBottom="8"/>
                                <text text="  · 给张三发微信说晚上吃饭" textSize="13sp" textColor="#1976d2" marginBottom="4"/>
                                <text text="  · 打开钉钉打卡" textSize="13sp" textColor="#1976d2" marginBottom="4"/>
                                <text text="  · 每天早上7:15在飞书打卡" textSize="13sp" textColor="#1976d2" marginBottom="4"/>
                                <text text="  · 在淘宝搜索蓝牙耳机" textSize="13sp" textColor="#1976d2"/>
                            </vertical>

                            <!-- 当前配置状态 -->
                            <vertical bg="#ffffff" padding="16" marginBottom="12">
                                <text text="⚙️ 当前配置" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="12"/>
                                <text id="homeCfgProvider" text="提供商: 未配置" textSize="13sp" textColor="#666666" marginBottom="4"/>
                                <text id="homeCfgModel" text="模型: --" textSize="13sp" textColor="#666666" marginBottom="4"/>
                                <text id="homeCfgKey" text="API Key: 未配置" textSize="13sp" textColor="#666666" marginBottom="4"/>
                                <text id="homeCfgSteps" text="最大步数: 15" textSize="13sp" textColor="#666666"/>
                                <button id="btnGoSettings" text="去配置" w="120" marginTop="12" textColor="#1976d2" bg="#e3f2fd"/>
                            </vertical>

                            <!-- 今日统计 -->
                            <vertical bg="#ffffff" padding="16" marginBottom="12">
                                <text text="📊 今日统计" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="12"/>
                                <horizontal>
                                    <text id="homeStatSuccess" text="✅ 0" textSize="18sp" textColor="#27ae60" layout_weight="1"/>
                                    <text id="homeStatFailed" text="❌ 0" textSize="18sp" textColor="#e74c3c" layout_weight="1"/>
                                </horizontal>
                            </vertical>
                        </vertical>
                    </scroll>
                </vertical>

                <!-- ========== 💬 Chat 页 ========== -->
                <vertical id="pageChat" visibility="gone">
                    <!-- 状态栏 -->
                    <horizontal bg="#e3f2fd" padding="8 10" gravity="center_vertical">
                        <text id="chatStatus" text="就绪" textSize="12sp" textColor="#1976d2" layout_weight="1"/>
                        <button id="chatBtnStop" text="停止" textSize="11sp" textColor="#e74c3c" bg="#ffffff" w="60" h="36"/>
                    </horizontal>

                    <!-- 消息列表 -->
                    <scroll id="chatScroll" layout_weight="1" padding="8">
                        <vertical id="chatMessageList">
                            <horizontal gravity="left" margin="4 8">
                                <vertical bg="#e8e8e8" padding="12 10" minWidth="60" maxWidth="300">
                                    <text text="你好！我是 Fold7 Agent AI 助手。" textSize="14sp" textColor="#333333"/>
                                    <text text="请告诉我您想要做什么，例如：" textSize="14sp" textColor="#333333" marginTop="4"/>
                                    <text text="  · 给张三发微信说晚上吃饭" textSize="13sp" textColor="#666666" marginTop="4"/>
                                    <text text="  · 打开钉钉打卡" textSize="13sp" textColor="#666666"/>
                                    <text text="  · 每天早上7:15在飞书打卡" textSize="13sp" textColor="#666666"/>
                                </vertical>
                            </horizontal>
                        </vertical>
                    </scroll>

                    <!-- 输入区域 -->
                    <vertical bg="#ffffff" padding="8 10" elevation="4">
                        <horizontal>
                            <input id="chatInput"
                                hint="输入指令..."
                                textSize="14sp"
                                textColor="#333333"
                                layout_weight="1"
                                maxLines="3"
                                minHeight="40"
                                padding="10 8"/>
                            <button id="chatBtnSend" text="发送" w="70" marginLeft="8" layout_gravity="bottom"/>
                        </horizontal>
                    </vertical>
                </vertical>

                <!-- ========== 📂 Manage 页 ========== -->
                <vertical id="pageManage" visibility="gone">
                    <horizontal bg="#ffffff" padding="12 16" elevation="2">
                        <text text="📂 脚本管理" textSize="18sp" textColor="#333333" textStyle="bold" layout_weight="1"/>
                        <button id="manageBtnRefresh" text="刷新" w="80"/>
                    </horizontal>
                    <scroll id="manageScroll" layout_weight="1" padding="8">
                        <vertical id="manageList">
                            <text text="加载中..." textSize="13sp" textColor="#999999" gravity="center" marginTop="32"/>
                        </vertical>
                    </scroll>
                </vertical>

                <!-- ========== 📖 Docs 页 ========== -->
                <vertical id="pageDocs" visibility="gone">
                    <horizontal bg="#ffffff" padding="12 16" elevation="2">
                        <text text="📖 文档" textSize="18sp" textColor="#333333" textStyle="bold"/>
                    </horizontal>
                    <scroll layout_weight="1" padding="16">
                        <vertical>
                            <text text="编码规范" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                            <text text="1. 优先使用 var，避免 const/let 重复声明问题" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="2. 不要使用箭头函数 =>，使用 function() {}" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="3. 不要使用模板字符串，使用 + 拼接" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="4. 不要使用解构赋值 {a,b} = obj" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="5. 不要使用 Promise/async/await" textSize="13sp" textColor="#555555" marginBottom="16"/>

                            <text text="应用操作知识" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                            <text text="【微信】" textSize="14sp" textColor="#333333" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 通讯录 → 搜索 → 点击联系人 → 发消息 → 输入 → 发送" textSize="12sp" textColor="#555555" marginBottom="12"/>
                            <text text="【钉钉】" textSize="14sp" textColor="#333333" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 工作台 → 考勤打卡 → 点击打卡按钮" textSize="12sp" textColor="#555555" marginBottom="12"/>
                            <text text="【飞书】" textSize="14sp" textColor="#333333" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 工作台 → 打卡" textSize="12sp" textColor="#555555" marginBottom="12"/>
                            <text text="【淘宝】" textSize="14sp" textColor="#333333" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 搜索框 → 输入关键词 → 点击搜索" textSize="12sp" textColor="#555555" marginBottom="16"/>

                            <text text="插件 / 模块说明" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                            <text text="这里不是让你安装外部插件。Docs 里列出的 ModelClient、ChatEngine、ScriptExecutor、UIAutomator 是 APP 内部模块。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="它们的作用是：模型配置和请求、对话生成、运行脚本、监控日志、出错后修复重试。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="对你的实际用处：你只需要在 Settings 配好模型，然后在 Chat 说需求，APP 会把需求变成脚本并执行。" textSize="12sp" textColor="#555555" marginBottom="16"/>

                            <text text="框架 API" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                            <text text="UIAutomator.executeCommand({action, target, text, delay_ms, reason})" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator.safeClick(target, timeout)" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator.safeInput(target, content)" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator.getScreenContext(maxChars)" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="StopHelper.setup() / check() / teardown()" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="Logger.taskStart() / taskEnd() / stepLog() / errorLog()" textSize="12sp" textColor="#555555" marginBottom="16"/>

                            <text text="操作间隔规范" textSize="16sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                            <text text="启动应用 ≥ 3000ms | 微信操作 ≥ 3000ms | 普通点击 ≥ 1000ms" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="输入文字 ≥ 800ms | 滑动 ≥ 1000ms | 返回/主页 ≥ 800ms" textSize="12sp" textColor="#555555"/>
                        </vertical>
                    </scroll>
                </vertical>

                <!-- ========== ⚙️ Settings 页 ========== -->
                <vertical id="pageSettings" visibility="gone">
                    <scroll layout_weight="1" padding="16">
                        <vertical>
                            <text text="模型配置" textSize="20sp" textColor="#222222" gravity="center" marginBottom="16"/>

                            <text text="API 格式" textSize="14sp" textColor="#666666"/>
                            <spinner id="settingFormat" entries="OpenAI 兼容|Anthropic 原生" marginBottom="12"/>

                            <!-- 提供商选择标签 -->
                            <horizontal gravity="center" marginBottom="12">
                                <button id="tabKimi" text="Kimi" w="90" marginRight="4"/>
                                <button id="tabDeepSeek" text="DeepSeek" w="90" marginRight="4"/>
                                <button id="tabLocal" text="本地" w="90"/>
                            </horizontal>

                            <!-- Kimi 配置页 -->
                            <vertical id="cfgPageKimi" visibility="visible">
                                <text text="Kimi Base URL" textSize="14sp" textColor="#666666"/>
                                <input id="kimiBaseUrl" text="" hint="https://api.kimi.com/coding" marginBottom="8"/>
                                <text text="Kimi API Key" textSize="14sp" textColor="#666666"/>
                                <input id="kimiApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>
                                <text text="Kimi 模型" textSize="14sp" textColor="#666666"/>
                                <input id="kimiModel" text="" hint="kimi-for-coding" marginBottom="12"/>
                            </vertical>

                            <!-- DeepSeek 配置页 -->
                            <vertical id="cfgPageDeepSeek" visibility="gone">
                                <text text="DeepSeek Base URL" textSize="14sp" textColor="#666666"/>
                                <input id="deepseekBaseUrl" text="" hint="https://api.deepseek.com/v1" marginBottom="8"/>
                                <text text="DeepSeek API Key" textSize="14sp" textColor="#666666"/>
                                <input id="deepseekApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>
                                <text text="DeepSeek 模型" textSize="14sp" textColor="#666666"/>
                                <input id="deepseekModel" text="" hint="deepseek-chat" marginBottom="12"/>
                            </vertical>

                            <!-- 本地模型配置页 -->
                            <vertical id="cfgPageLocal" visibility="gone">
                                <text text="本地 Base URL" textSize="14sp" textColor="#666666"/>
                                <input id="localBaseUrl" text="" hint="http://127.0.0.1:8080/v1" marginBottom="8"/>
                                <text text="本地模型名" textSize="14sp" textColor="#666666"/>
                                <input id="localModel" text="" hint="local" marginBottom="12"/>
                            </vertical>

                            <!-- 通用配置 -->
                            <text text="最大执行步数" textSize="14sp" textColor="#666666"/>
                            <input id="maxSteps" text="" hint="15" inputType="number" marginBottom="16"/>

                            <horizontal gravity="center">
                                <button id="btnTest" text="测试连接" w="100" marginRight="8"/>
                                <button id="btnSave" text="保存配置" w="100"/>
                            </horizontal>

                            <text id="settingStatus" text="" textSize="12sp" textColor="#e74c3c" gravity="center" marginTop="12"/>

                            <!-- 当前配置状态 -->
                            <vertical bg="#f0f0f0" padding="12" marginTop="16">
                                <text text="当前配置状态" textSize="14sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                                <text id="statusProvider" text="提供商: --" textSize="13sp" textColor="#666666"/>
                                <text id="statusModel" text="模型: --" textSize="13sp" textColor="#666666"/>
                                <text id="statusKey" text="API Key: --" textSize="13sp" textColor="#666666"/>
                                <text id="statusSteps" text="最大步数: --" textSize="13sp" textColor="#666666"/>
                            </vertical>
                        </vertical>
                    </scroll>
                </vertical>

            </frame>

            <!-- ========== 底部导航栏 ========== -->
            <horizontal bg="#ffffff" h="56" elevation="8">
                <horizontal id="navHome" layout_weight="1" gravity="center" bg="#e3f2fd">
                    <vertical gravity="center">
                        <text text="🏠" textSize="18sp"/>
                        <text text="Home" textSize="10sp" textColor="#1976d2" textStyle="bold"/>
                    </vertical>
                </horizontal>
                <horizontal id="navChat" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="💬" textSize="18sp"/>
                        <text text="Chat" textSize="10sp" textColor="#666666"/>
                    </vertical>
                </horizontal>
                <horizontal id="navManage" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="📂" textSize="18sp"/>
                        <text text="Manage" textSize="10sp" textColor="#666666"/>
                    </vertical>
                </horizontal>
                <horizontal id="navDocs" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="📖" textSize="18sp"/>
                        <text text="Docs" textSize="10sp" textColor="#666666"/>
                    </vertical>
                </horizontal>
                <horizontal id="navSettings" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="⚙️" textSize="18sp"/>
                        <text text="Settings" textSize="10sp" textColor="#666666"/>
                    </vertical>
                </horizontal>
            </horizontal>
        </vertical>
    </frame>
);

ui.statusBarColor("#1976d2");

try {
    ScreenshotCleaner.clean();
} catch (e) {
    log("截图清理失败: " + e.message);
}

function makeBg(color, radius) {
    var bg = new android.graphics.drawable.GradientDrawable();
    bg.setColor(colors.parseColor(color));
    bg.setCornerRadius(radius || 0);
    return bg;
}

function makeBubbleBg(color, radii) {
    var bg = new android.graphics.drawable.GradientDrawable();
    bg.setColor(colors.parseColor(color));
    bg.setCornerRadii(radii);
    return bg;
}

function setTextBold(textView, active) {
    textView.setTypeface(null, active ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
}

// ===================== 导航切换 =====================
var currentPage = "home";

function switchPage(page) {
    // 隐藏所有页面
    ui.pageHome.setVisibility(android.view.View.GONE);
    ui.pageChat.setVisibility(android.view.View.GONE);
    ui.pageManage.setVisibility(android.view.View.GONE);
    ui.pageDocs.setVisibility(android.view.View.GONE);
    ui.pageSettings.setVisibility(android.view.View.GONE);

    // 重置所有导航样式
    setNavStyle("navHome", false);
    setNavStyle("navChat", false);
    setNavStyle("navManage", false);
    setNavStyle("navDocs", false);
    setNavStyle("navSettings", false);

    // 显示目标页面
    if (page === "home") {
        ui.pageHome.setVisibility(android.view.View.VISIBLE);
        setNavStyle("navHome", true);
        refreshHomePage();
    } else if (page === "chat") {
        ui.pageChat.setVisibility(android.view.View.VISIBLE);
        setNavStyle("navChat", true);
    } else if (page === "manage") {
        ui.pageManage.setVisibility(android.view.View.VISIBLE);
        setNavStyle("navManage", true);
        refreshManagePage();
    } else if (page === "docs") {
        ui.pageDocs.setVisibility(android.view.View.VISIBLE);
        setNavStyle("navDocs", true);
    } else if (page === "settings") {
        ui.pageSettings.setVisibility(android.view.View.VISIBLE);
        setNavStyle("navSettings", true);
        refreshSettingsPage();
    }
    currentPage = page;
}

function setNavStyle(navId, active) {
    var nav = ui[navId];
    nav.setBackgroundColor(colors.parseColor(active ? NAV_ACTIVE_BG : NAV_INACTIVE_BG));
    var textView = nav.getChildAt(0).getChildAt(1);
    textView.setTextColor(colors.parseColor(active ? NAV_ACTIVE_COLOR : NAV_INACTIVE_COLOR));
    setTextBold(textView, active);
}

ui.navHome.click(function () { switchPage("home"); });
ui.navChat.click(function () { switchPage("chat"); });
ui.navManage.click(function () { switchPage("manage"); });
ui.navDocs.click(function () { switchPage("docs"); });
ui.navSettings.click(function () { switchPage("settings"); });

// ===================== 🏠 Home 页逻辑 =====================
function refreshHomePage() {
    var cfg = loadConfigSafe();
    var providerName = AppConfig.providerLabel(cfg.provider);
    var providerCfg = cfg[cfg.provider] || {};
    var hasKey = providerCfg.apiKey && providerCfg.apiKey.length > 5;

    ui.homeCfgProvider.setText("提供商: " + providerName);
    ui.homeCfgModel.setText("模型: " + (providerCfg.model || "--"));
    ui.homeCfgKey.setText("API Key: " + (hasKey ? "已配置" : "未配置"));
    ui.homeCfgSteps.setText("最大步数: " + (cfg.maxSteps || 15));

    var stats = Logger.todayStats();
    ui.homeStatSuccess.setText("✅ " + stats.success);
    ui.homeStatFailed.setText("❌ " + stats.failed);
}

ui.btnGoSettings.click(function () {
    switchPage("settings");
});

// ===================== 💬 Chat 页逻辑 =====================
var chatEngine = ChatEngine.create({
    onMessage: function (msg) {
        addChatMessage(msg, "assistant");
    },
    onScript: function (code, desc) {
        addScriptCard(code, desc);
    },
    onLog: function (line) {
        // 可选：在聊天界面实时显示日志
    },
    onStatus: function (status) {
        ui.run(function () {
            ui.chatStatus.setText(status);
            if (status.indexOf("✅") >= 0) {
                ui.chatStatus.setTextColor(colors.parseColor("#27ae60"));
            } else if (status.indexOf("❌") >= 0 || status.indexOf("失败") >= 0) {
                ui.chatStatus.setTextColor(colors.parseColor("#e74c3c"));
            } else if (status.indexOf("🧠") >= 0) {
                ui.chatStatus.setTextColor(colors.parseColor("#1976d2"));
            } else {
                ui.chatStatus.setTextColor(colors.parseColor("#666666"));
            }
        });
    },
    onComplete: function (report) {
        var msg = report.success
            ? "✅ 任务执行完成"
            : "❌ 任务执行失败: " + (report.error || "未知错误");
        addChatMessage(msg, "assistant");
        ui.run(function () {
            ui.chatStatus.setText(report.success ? "就绪" : "执行失败");
        });
    },
});

ui.chatBtnSend.click(function () {
    var text = String(ui.chatInput.getText() || "").trim();
    if (!text) {
        toastLog("请输入指令");
        return;
    }
    ui.chatInput.setText("");
    addChatMessage(text, "user");
    chatEngine.send(text);
});

ui.chatBtnStop.click(function () {
    chatEngine.stop();
    toastLog("已停止当前任务");
});

function addChatMessage(text, role) {
    ui.run(function () {
        var container = ui.chatMessageList;
        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(role === "user" ? android.view.Gravity.RIGHT : android.view.Gravity.LEFT);
        row.setPadding(4, 8, 4, 8);

        var bubble = new android.widget.TextView(context);
        bubble.setText(text);
        bubble.setTextSize(14);
        if (role === "user") {
            bubble.setTextColor(colors.parseColor("#ffffff"));
            bubble.setBackgroundDrawable(makeBubbleBg("#1976d2", [24, 24, 4, 4, 24, 24, 24, 24]));
        } else {
            bubble.setTextColor(colors.parseColor("#333333"));
            bubble.setBackgroundDrawable(makeBubbleBg("#e8e8e8", [4, 4, 24, 24, 24, 24, 24, 24]));
        }
        bubble.setPadding(24, 16, 24, 16);
        bubble.setMaxWidth(device.width * 0.75);

        row.addView(bubble);
        container.addView(row);
        ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
    });
}

function addScriptCard(code, desc) {
    var filename = "script_" + Date.now() + ".js";
    ui.run(function () {
        var container = ui.chatMessageList;

        // 描述
        var descRow = new android.widget.LinearLayout(context);
        descRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        descRow.setGravity(android.view.Gravity.LEFT);
        descRow.setPadding(4, 8, 4, 4);
        var descText = new android.widget.TextView(context);
        descText.setText("📜 " + (desc || "生成的脚本"));
        descText.setTextSize(13);
        descText.setTextColor(colors.parseColor("#666666"));
        descRow.addView(descText);
        container.addView(descRow);

        // 预览
        var previewRow = new android.widget.LinearLayout(context);
        previewRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        previewRow.setGravity(android.view.Gravity.LEFT);
        previewRow.setPadding(4, 4, 4, 4);
        var preview = new android.widget.TextView(context);
        var previewText = code.substring(0, 500).replace(/</g, "<").replace(/>/g, ">");
        if (code.length > 500) previewText += "\n... (共 " + code.length + " 字符)";
        preview.setText(previewText);
        preview.setTextSize(11);
        preview.setTextColor(colors.parseColor("#555555"));
        preview.setBackgroundDrawable(makeBg("#f0f0f0", 8));
        preview.setPadding(16, 12, 16, 12);
        preview.setMaxWidth(device.width * 0.85);
        previewRow.addView(preview);
        container.addView(previewRow);

        // 按钮
        var btnRow = new android.widget.LinearLayout(context);
        btnRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        btnRow.setGravity(android.view.Gravity.LEFT);
        btnRow.setPadding(4, 4, 4, 12);

        var btnRun = new android.widget.Button(context);
        btnRun.setText("▶ 执行");
        btnRun.setTextSize(13);
        btnRun.setTextColor(colors.parseColor("#ffffff"));
        btnRun.setBackgroundDrawable(makeBg("#4caf50", 8));
        btnRun.setPadding(24, 12, 24, 12);

        var btnSave = new android.widget.Button(context);
        btnSave.setText("💾 保存");
        btnSave.setTextSize(13);
        btnSave.setTextColor(colors.parseColor("#ffffff"));
        btnSave.setBackgroundDrawable(makeBg("#1976d2", 8));
        btnSave.setPadding(24, 12, 24, 12);
        var lpSave = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lpSave.leftMargin = 16;
        btnSave.setLayoutParams(lpSave);

        (function (scriptCode, scriptFile) {
            btnRun.setOnClickListener(new android.view.View.OnClickListener({
                onClick: function () {
                    threads.start(function () {
                        try {
                            chatEngine.execute(scriptCode, "用户手动执行");
                        } catch (e) {
                            toastLog("执行失败: " + e.message);
                        }
                    });
                }
            }));
            btnSave.setOnClickListener(new android.view.View.OnClickListener({
                onClick: function () {
                    threads.start(function () {
                        try {
                            if (!files.exists(SAVE_DIR)) files.createWithDirs(SAVE_DIR);
                            var path = files.path(SAVE_DIR + scriptFile);
                            files.write(path, scriptCode);
                            ui.run(function () { toastLog("脚本已保存: " + path); });
                        } catch (e) {
                            ui.run(function () { toastLog("保存失败: " + e.message); });
                        }
                    });
                }
            }));
        })(code, filename);

        btnRow.addView(btnRun);
        btnRow.addView(btnSave);
        container.addView(btnRow);
        ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
    });
}

// ===================== 📂 Manage 页逻辑 =====================
function refreshManagePage() {
    threads.start(function () {
        try {
            var list = [];
            if (files.exists(SAVE_DIR)) {
                var entries = files.listDir(SAVE_DIR);
                entries.forEach(function (name) {
                    if (name.length >= 3 && name.substring(name.length - 3) === ".js") {
                        var path = SAVE_DIR + name;
                        var size = files.isFile(path) ? files.read(path).length : 0;
                        list.push({ name: name, path: path, size: size });
                    }
                });
            }

            ui.run(function () {
                var container = ui.manageList;
                container.removeAllViews();

                if (list.length === 0) {
                    var empty = new android.widget.TextView(context);
                    empty.setText("暂无保存的脚本\n在 Chat 页面生成脚本后可保存到这里");
                    empty.setTextSize(13);
                    empty.setTextColor(colors.parseColor("#999999"));
                    empty.setGravity(android.view.Gravity.CENTER);
                    empty.setPadding(0, 48, 0, 0);
                    container.addView(empty);
                    return;
                }

                list.forEach(function (item) {
                    var card = new android.widget.LinearLayout(context);
                    card.setOrientation(android.widget.LinearLayout.VERTICAL);
                    card.setPadding(24, 16, 24, 16);
                    card.setBackgroundDrawable(makeBg("#ffffff", 12));
                    var lp = new android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                    lp.setMargins(8, 6, 8, 6);
                    card.setLayoutParams(lp);

                    var nameText = new android.widget.TextView(context);
                    nameText.setText(item.name);
                    nameText.setTextSize(14);
                    nameText.setTextColor(colors.parseColor("#333333"));
                    setTextBold(nameText, true);
                    card.addView(nameText);

                    var infoText = new android.widget.TextView(context);
                    infoText.setText(item.size + " 字符");
                    infoText.setTextSize(12);
                    infoText.setTextColor(colors.parseColor("#999999"));
                    infoText.setPadding(0, 4, 0, 8);
                    card.addView(infoText);

                    var btnRow = new android.widget.LinearLayout(context);
                    btnRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);

                    var btnRun = new android.widget.Button(context);
                    btnRun.setText("▶ 执行");
                    btnRun.setTextSize(11);
                    btnRun.setTextColor(colors.parseColor("#4caf50"));
                    btnRun.setBackgroundColor(colors.parseColor("#ffffff"));
                    btnRun.setPadding(16, 8, 16, 8);

                    var btnDel = new android.widget.Button(context);
                    btnDel.setText("🗑 删除");
                    btnDel.setTextSize(11);
                    btnDel.setTextColor(colors.parseColor("#e74c3c"));
                    btnDel.setBackgroundColor(colors.parseColor("#ffffff"));
                    btnDel.setPadding(16, 8, 16, 8);

                    (function (filePath, fileName) {
                        btnRun.setOnClickListener(new android.view.View.OnClickListener({
                            onClick: function () {
                                threads.start(function () {
                                    try {
                                        var code = files.read(filePath);
                                        chatEngine.execute(code, fileName);
                                    } catch (e) {
                                        toastLog("执行失败: " + e.message);
                                    }
                                });
                            }
                        }));
                        btnDel.setOnClickListener(new android.view.View.OnClickListener({
                            onClick: function () {
                                threads.start(function () {
                                    try {
                                        files.remove(filePath);
                                        ui.run(function () {
                                            toastLog("已删除: " + fileName);
                                            refreshManagePage();
                                        });
                                    } catch (e) {
                                        toastLog("删除失败: " + e.message);
                                    }
                                });
                            }
                        }));
                    })(item.path, item.name);

                    btnRow.addView(btnRun);
                    btnRow.addView(btnDel);
                    card.addView(btnRow);
                    container.addView(card);
                });
            });
        } catch (e) {
            log("加载脚本列表失败: " + e.message);
        }
    });
}

ui.manageBtnRefresh.click(function () {
    refreshManagePage();
    toastLog("已刷新");
});

// ===================== ⚙️ Settings 页逻辑 =====================
var activeProvider = "kimi";

function loadConfigSafe() {
    return AppConfig.read();
}

function refreshSettingsPage() {
    var current = loadConfigSafe();
    activeProvider = current.provider || "kimi";

    var currentFormat = current.format || "anthropic";
    if (currentFormat === "openai") {
        ui.settingFormat.setSelection(0);
    } else {
        ui.settingFormat.setSelection(1);
    }

    ui.kimiBaseUrl.setText(current.kimi.baseUrl || "https://api.kimi.com/coding");
    ui.kimiApiKey.setText(current.kimi.apiKey || "");
    ui.kimiModel.setText(current.kimi.model || "kimi-for-coding");
    ui.deepseekBaseUrl.setText(current.deepseek.baseUrl || "https://api.deepseek.com/v1");
    ui.deepseekApiKey.setText(current.deepseek.apiKey || "");
    ui.deepseekModel.setText(current.deepseek.model || "deepseek-chat");
    ui.localBaseUrl.setText(current.local.baseUrl || "http://127.0.0.1:8080/v1");
    ui.localModel.setText(current.local.model || "local");
    ui.maxSteps.setText(String(current.maxSteps || 15));

    switchCfgTab(activeProvider);
    updateSettingStatus();
}

function switchCfgTab(provider) {
    activeProvider = provider;
    ui.cfgPageKimi.setVisibility(provider === "kimi" ? android.view.View.VISIBLE : android.view.View.GONE);
    ui.cfgPageDeepSeek.setVisibility(provider === "deepseek" ? android.view.View.VISIBLE : android.view.View.GONE);
    ui.cfgPageLocal.setVisibility(provider === "local" ? android.view.View.VISIBLE : android.view.View.GONE);

    ui.tabKimi.setBackgroundColor(colors.parseColor(provider === "kimi" ? "#1976d2" : "#f0f0f0"));
    ui.tabKimi.setTextColor(colors.parseColor(provider === "kimi" ? "#ffffff" : "#333333"));
    ui.tabDeepSeek.setBackgroundColor(colors.parseColor(provider === "deepseek" ? "#1976d2" : "#f0f0f0"));
    ui.tabDeepSeek.setTextColor(colors.parseColor(provider === "deepseek" ? "#ffffff" : "#333333"));
    ui.tabLocal.setBackgroundColor(colors.parseColor(provider === "local" ? "#1976d2" : "#f0f0f0"));
    ui.tabLocal.setTextColor(colors.parseColor(provider === "local" ? "#ffffff" : "#333333"));
}

ui.tabKimi.click(function () { switchCfgTab("kimi"); });
ui.tabDeepSeek.click(function () { switchCfgTab("deepseek"); });
ui.tabLocal.click(function () { switchCfgTab("local"); });

function updateSettingStatus() {
    var cfg = loadConfigSafe();
    var providerName = AppConfig.providerLabel(cfg.provider);
    var providerCfg = cfg[cfg.provider] || {};
    var hasKey = providerCfg.apiKey && providerCfg.apiKey.length > 5;
    ui.statusProvider.setText("提供商: " + providerName);
    ui.statusModel.setText("模型: " + (providerCfg.model || "--"));
    ui.statusKey.setText("API Key: " + (hasKey ? "已配置 ✅" : "未配置 ❌"));
    ui.statusSteps.setText("最大步数: " + (cfg.maxSteps || 15));
}

// 测试连接
ui.btnTest.click(function () {
    ui.settingStatus.setText("🔄 正在测试连接...");
    ui.settingStatus.setTextColor(colors.parseColor("#666666"));

    threads.start(function () {
        try {
            var cfg = {
                provider: activeProvider,
                format: ui.settingFormat.getSelectedItemPosition() === 0 ? "openai" : "anthropic",
                kimi: {
                    baseUrl: String(ui.kimiBaseUrl.getText() || "https://api.kimi.com/coding").trim(),
                    apiKey: String(ui.kimiApiKey.getText() || "").trim(),
                    model: String(ui.kimiModel.getText() || "kimi-for-coding").trim(),
                },
                deepseek: {
                    baseUrl: String(ui.deepseekBaseUrl.getText() || "https://api.deepseek.com/v1").trim(),
                    apiKey: String(ui.deepseekApiKey.getText() || "").trim(),
                    model: String(ui.deepseekModel.getText() || "deepseek-chat").trim(),
                },
                local: {
                    baseUrl: String(ui.localBaseUrl.getText() || "http://127.0.0.1:8080/v1").trim(),
                    apiKey: "",
                    model: String(ui.localModel.getText() || "local").trim(),
                },
                maxSteps: parseInt(String(ui.maxSteps.getText() || "15")) || 15,
            };
            var providerCfg = cfg[cfg.provider] || cfg.kimi;
            if (cfg.provider !== "local" && (!providerCfg.apiKey || providerCfg.apiKey.length < 10)) {
                ui.run(function () {
                    ui.settingStatus.setText("❌ API Key 不能为空");
                    ui.settingStatus.setTextColor(colors.parseColor("#e74c3c"));
                });
                return;
            }

            var res = ModelClient.testConnection(cfg.provider, cfg.format, providerCfg);
            var statusCode = res ? res.statusCode : 0;
            ui.run(function () {
                if (statusCode >= 200 && statusCode < 300) {
                    ui.settingStatus.setText("✅ 连接成功 (" + statusCode + ")");
                    ui.settingStatus.setTextColor(colors.parseColor("#4caf50"));
                } else {
                    ui.settingStatus.setText("❌ 连接失败: HTTP " + statusCode);
                    ui.settingStatus.setTextColor(colors.parseColor("#e74c3c"));
                }
            });
        } catch (e) {
            log("模型测试失败: " + e.message);
            ui.run(function () {
                ui.settingStatus.setText("❌ 连接失败: " + e.message);
                ui.settingStatus.setTextColor(colors.parseColor("#e74c3c"));
            });
        }
    });
});

// 保存配置
ui.btnSave.click(function () {
    var format = ui.settingFormat.getSelectedItemPosition() === 0 ? "openai" : "anthropic";
    var kimiBaseUrl = String(ui.kimiBaseUrl.getText() || "https://api.kimi.com/coding").trim();
    var kimiApiKey = String(ui.kimiApiKey.getText() || "").trim();
    var kimiModel = String(ui.kimiModel.getText() || "kimi-for-coding").trim();
    var deepseekBaseUrl = String(ui.deepseekBaseUrl.getText() || "https://api.deepseek.com/v1").trim();
    var deepseekApiKey = String(ui.deepseekApiKey.getText() || "").trim();
    var deepseekModel = String(ui.deepseekModel.getText() || "deepseek-chat").trim();
    var localBaseUrl = String(ui.localBaseUrl.getText() || "http://127.0.0.1:8080/v1").trim();
    var localModel = String(ui.localModel.getText() || "local").trim();
    var maxSteps = parseInt(String(ui.maxSteps.getText() || "15")) || 15;

    if (activeProvider === "kimi" && kimiApiKey.length < 10) {
        ui.settingStatus.setText("❌ Kimi API Key 不能为空");
        ui.settingStatus.setTextColor(colors.parseColor("#e74c3c"));
        return;
    }
    if (activeProvider === "deepseek" && deepseekApiKey.length < 10) {
        ui.settingStatus.setText("❌ DeepSeek API Key 不能为空");
        ui.settingStatus.setTextColor(colors.parseColor("#e74c3c"));
        return;
    }

    var configObj = {
        provider: activeProvider,
        format: format,
        kimi: {
            baseUrl: kimiBaseUrl,
            apiKey: kimiApiKey,
            model: kimiModel,
        },
        deepseek: {
            baseUrl: deepseekBaseUrl,
            apiKey: deepseekApiKey,
            model: deepseekModel,
        },
        local: {
            baseUrl: localBaseUrl,
            apiKey: "",
            model: localModel,
        },
        maxSteps: maxSteps,
        delay: {
            min: 500,
            max: 2000,
            wechatMin: 3000,
        },
    };

    try {
        AppConfig.write(configObj);
        ModelClient.reloadConfig();
        CONFIG = AppConfig.read();
        HAS_MODEL_CONFIG = AppConfig.isConfigured(CONFIG);
        toastLog("✅ 配置已保存");
        ui.settingStatus.setText("✅ 配置已保存");
        ui.settingStatus.setTextColor(colors.parseColor("#4caf50"));
        updateSettingStatus();
    } catch (e) {
        ui.settingStatus.setText("❌ 保存失败: " + e.message);
        ui.settingStatus.setTextColor(colors.parseColor("#e74c3c"));
    }
});

// ===================== 启动 =====================
if (!HAS_MODEL_CONFIG) {
    // 首次运行，跳转到 Settings 页面
    switchPage("settings");
    toastLog("首次运行，请先配置模型");
} else {
    switchPage("home");
}

})();
