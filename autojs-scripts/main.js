/**
 * Fold7 Agent — 完整应用框架（v2）
 *
 * 这是一个运行在 AutoX.js 中的完整 APP，包含：
 *   Home     — 快速入口、欢迎、常用指令
 *   Chat     — AI 对话生成脚本 → 执行 → 自动调试
 *   Manage   — 管理已保存的脚本
 *   Docs     — 编码规范、应用知识、帮助文档
 *   Settings — 模型配置（Kimi / DeepSeek / Local）
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
var COLOR_INK = "#24231f";
var COLOR_MUTED = "#716f68";
var COLOR_LINE = "#dedbd2";
var COLOR_PANEL = "#ffffff";
var COLOR_CANVAS = "#f4f2ec";
var COLOR_ACCENT = "#2f7d62";
var COLOR_ACCENT_SOFT = "#dfeee7";
var COLOR_DANGER = "#b14a42";
var COLOR_SUCCESS = "#2f7d62";
var NAV_ACTIVE_COLOR = COLOR_INK;
var NAV_INACTIVE_COLOR = COLOR_MUTED;
var NAV_ACTIVE_BG = COLOR_ACCENT_SOFT;
var NAV_INACTIVE_BG = COLOR_PANEL;

// ===================== 应用框架布局 =====================
ui.layout(
    <frame>
        <vertical>
            <!-- 标题栏 -->
            <horizontal bg="#24231f" padding="14 18" gravity="center_vertical">
                <text text="Fold7 Agent" textSize="20sp" textColor="#ffffff" textStyle="bold"/>
                <text text="AI Automation Console" textSize="11sp" textColor="#c8d8ce" marginLeft="10" layout_gravity="center_vertical"/>
            </horizontal>

            <!-- 页面容器 -->
            <frame id="pageContainer" layout_weight="1" bg="#f4f2ec">

                <!-- ========== Home 页 ========== -->
                <vertical id="pageHome" visibility="visible" padding="16">
                    <scroll>
                        <vertical>
                            <text text="Agent 工作台" textSize="24sp" textColor="#24231f" textStyle="bold" marginBottom="6"/>
                            <text text="对话确认意图，生成手机自动化脚本，并在运行时监控日志与错误。" textSize="13sp" textColor="#716f68" marginBottom="18"/>

                            <!-- 快速入口卡片 -->
                            <vertical bg="#ffffff" padding="18" marginBottom="12">
                                <text text="创建脚本流程" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="12"/>
                                <text text="1. Chat 输入自然语言需求" textSize="13sp" textColor="#2f7d62" marginBottom="5"/>
                                <text text="2. AI 先拆解动作并等待你确认" textSize="13sp" textColor="#2f7d62" marginBottom="5"/>
                                <text text="3. 确认后生成 AutoX.js 脚本" textSize="13sp" textColor="#2f7d62" marginBottom="5"/>
                                <text text="4. APP 执行、记录日志、失败后自动修复" textSize="13sp" textColor="#2f7d62"/>
                            </vertical>

                            <!-- 当前配置状态 -->
                            <vertical bg="#ffffff" padding="16" marginBottom="12">
                                <text text="模型状态" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="12"/>
                                <text id="homeCfgProvider" text="提供商: 未配置" textSize="13sp" textColor="#716f68" marginBottom="4"/>
                                <text id="homeCfgModel" text="模型: --" textSize="13sp" textColor="#716f68" marginBottom="4"/>
                                <text id="homeCfgKey" text="API Key: 未配置" textSize="13sp" textColor="#716f68" marginBottom="4"/>
                                <text id="homeCfgSteps" text="最大步数: 15" textSize="13sp" textColor="#716f68"/>
                                <button id="btnGoSettings" text="配置模型" w="120" marginTop="12" textColor="#24231f" bg="#dfeee7"/>
                            </vertical>

                            <!-- 今日统计 -->
                            <vertical bg="#ffffff" padding="16" marginBottom="12">
                                <text text="今日执行" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="12"/>
                                <horizontal>
                                    <text id="homeStatSuccess" text="成功 0" textSize="18sp" textColor="#2f7d62" layout_weight="1"/>
                                    <text id="homeStatFailed" text="失败 0" textSize="18sp" textColor="#b14a42" layout_weight="1"/>
                                </horizontal>
                            </vertical>
                        </vertical>
                    </scroll>
                </vertical>

                <!-- ========== Chat 页 ========== -->
                <vertical id="pageChat" visibility="gone">
                    <!-- 状态栏 -->
                    <horizontal bg="#dfeee7" padding="10 14" gravity="center_vertical">
                        <text text="Chat" textSize="15sp" textColor="#24231f" textStyle="bold" marginRight="10"/>
                        <text id="chatStatus" text="就绪" textSize="12sp" textColor="#2f7d62" layout_weight="1"/>
                    </horizontal>

                    <!-- 消息列表 -->
                    <scroll id="chatScroll" layout_weight="1" padding="10">
                        <vertical id="chatMessageList">
                            <horizontal gravity="left" margin="4 8">
                                <vertical bg="#ffffff" padding="14 12" minWidth="60" maxWidth="320">
                                    <text text="我是 Fold7 Agent。" textSize="15sp" textColor="#24231f" textStyle="bold"/>
                                    <text text="我会先确认你的操作意图，确认后才生成并运行脚本。" textSize="13sp" textColor="#716f68" marginTop="6"/>
                                    <text text="示例：打开设置，进入蓝牙页面，然后返回桌面。" textSize="13sp" textColor="#2f7d62" marginTop="8"/>
                                </vertical>
                            </horizontal>
                        </vertical>
                    </scroll>

                    <!-- 输入区域 -->
                    <vertical bg="#ffffff" padding="10 12" elevation="4">
                        <horizontal>
                            <input id="chatInput"
                                hint="输入你要手机完成的动作..."
                                textSize="14sp"
                                textColor="#24231f"
                                layout_weight="1"
                                maxLines="3"
                                minHeight="40"
                                padding="10 8"/>
                            <button id="chatBtnSend" text="发送" w="74" marginLeft="8" layout_gravity="bottom" textColor="#ffffff" bg="#2f7d62"/>
                        </horizontal>
                    </vertical>
                </vertical>

                <!-- ========== Manage 页 ========== -->
                <vertical id="pageManage" visibility="gone">
                    <horizontal bg="#ffffff" padding="14 16" elevation="2" gravity="center_vertical">
                        <vertical layout_weight="1">
                            <text text="脚本管理" textSize="18sp" textColor="#24231f" textStyle="bold"/>
                            <text text="这里保存 Chat 生成的业务脚本" textSize="12sp" textColor="#716f68" marginTop="3"/>
                        </vertical>
                        <button id="manageBtnRefresh" text="刷新" w="82" textColor="#24231f" bg="#dfeee7"/>
                    </horizontal>
                    <scroll id="manageScroll" layout_weight="1" padding="10">
                        <vertical id="manageList">
                            <text text="加载中..." textSize="13sp" textColor="#716f68" gravity="center" marginTop="32"/>
                        </vertical>
                    </scroll>
                </vertical>

                <!-- ========== Docs 页 ========== -->
                <vertical id="pageDocs" visibility="gone">
                    <horizontal bg="#ffffff" padding="14 16" elevation="2">
                        <vertical>
                            <text text="框架文档" textSize="18sp" textColor="#24231f" textStyle="bold"/>
                            <text text="约束模型生成过程，减少低级脚本错误" textSize="12sp" textColor="#716f68" marginTop="3"/>
                        </vertical>
                    </horizontal>
                    <scroll layout_weight="1" padding="16">
                        <vertical>
                            <text text="编码规范" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="8"/>
                            <text text="1. 优先使用 var，避免 const/let 重复声明问题" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="2. 不要使用箭头函数 =>，使用 function() {}" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="3. 不要使用模板字符串，使用 + 拼接" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="4. 不要使用解构赋值 {a,b} = obj" textSize="13sp" textColor="#555555" marginBottom="4"/>
                            <text text="5. 不要使用 Promise/async/await" textSize="13sp" textColor="#555555" marginBottom="16"/>

                            <text text="应用操作知识" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="8"/>
                            <text text="微信" textSize="14sp" textColor="#24231f" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 通讯录 → 搜索 → 点击联系人 → 发消息 → 输入 → 发送" textSize="12sp" textColor="#555555" marginBottom="12"/>
                            <text text="钉钉" textSize="14sp" textColor="#24231f" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 工作台 → 考勤打卡 → 点击打卡按钮" textSize="12sp" textColor="#555555" marginBottom="12"/>
                            <text text="飞书" textSize="14sp" textColor="#24231f" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 工作台 → 打卡" textSize="12sp" textColor="#555555" marginBottom="12"/>
                            <text text="淘宝" textSize="14sp" textColor="#24231f" textStyle="bold" marginBottom="4"/>
                            <text text="打开 → 搜索框 → 输入关键词 → 点击搜索" textSize="12sp" textColor="#555555" marginBottom="16"/>

                            <text text="内部模块说明" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="8"/>
                            <text text="这里说的模块不是外部插件，也不需要你额外安装。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="ModelClient 负责模型配置、URL 拼接、请求、响应日志。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="ChatEngine 负责对话流程：先确认意图，再生成脚本，再交给执行器。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="ScriptExecutor 负责运行生成脚本、监控日志、判定成功失败。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator 是生成脚本调用的手机操作 API，统一封装点击、输入、启动 APP、等待、返回。" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="对你的用处：以后你只需要在 Chat 说需求，APP 框架负责生成、运行、保存和修复脚本；业务脚本里不会再写模型或对话逻辑。" textSize="12sp" textColor="#555555" marginBottom="16"/>

                            <text text="框架 API" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="8"/>
                            <text text="UIAutomator.executeCommand({action, target, text, delay_ms, reason})" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator.safeClick(target, timeout)" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator.safeInput(target, content)" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="UIAutomator.getScreenContext(maxChars)" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="StopHelper.setup() / check() / teardown()" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="Logger.taskStart() / taskEnd() / stepLog() / errorLog()" textSize="12sp" textColor="#555555" marginBottom="16"/>

                            <text text="操作间隔规范" textSize="16sp" textColor="#24231f" textStyle="bold" marginBottom="8"/>
                            <text text="启动应用 ≥ 3000ms | 微信操作 ≥ 3000ms | 普通点击 ≥ 1000ms" textSize="12sp" textColor="#555555" marginBottom="4"/>
                            <text text="输入文字 ≥ 800ms | 滑动 ≥ 1000ms | 返回/主页 ≥ 800ms" textSize="12sp" textColor="#555555"/>
                        </vertical>
                    </scroll>
                </vertical>

                <!-- ========== Settings 页 ========== -->
                <vertical id="pageSettings" visibility="gone">
                    <scroll layout_weight="1" padding="16">
                        <vertical>
                            <text text="模型配置" textSize="22sp" textColor="#24231f" textStyle="bold" marginBottom="6"/>
                            <text text="选择提供商、API 格式和模型。测试连接通过后保存。" textSize="13sp" textColor="#716f68" marginBottom="16"/>

                            <text text="API 格式" textSize="14sp" textColor="#716f68"/>
                            <spinner id="settingFormat" entries="OpenAI 兼容|Anthropic 原生" marginBottom="12"/>

                            <!-- 提供商选择标签 -->
                            <horizontal gravity="center" marginBottom="14">
                                <button id="tabKimi" text="Kimi" w="96" marginRight="6"/>
                                <button id="tabDeepSeek" text="DeepSeek" w="102" marginRight="6"/>
                                <button id="tabLocal" text="本地" w="86"/>
                            </horizontal>

                            <!-- Kimi 配置页 -->
                            <vertical id="cfgPageKimi" visibility="visible">
                                <text text="Kimi Base URL" textSize="14sp" textColor="#716f68"/>
                                <input id="kimiBaseUrl" text="" hint="https://api.kimi.com/coding" marginBottom="8"/>
                                <text text="Kimi API Key" textSize="14sp" textColor="#716f68"/>
                                <input id="kimiApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>
                                <text text="Kimi 模型" textSize="14sp" textColor="#716f68"/>
                                <input id="kimiModel" text="" hint="kimi-for-coding" marginBottom="12"/>
                            </vertical>

                            <!-- DeepSeek 配置页 -->
                            <vertical id="cfgPageDeepSeek" visibility="gone">
                                <text text="DeepSeek Base URL" textSize="14sp" textColor="#716f68"/>
                                <input id="deepseekBaseUrl" text="" hint="https://api.deepseek.com/v1" marginBottom="8"/>
                                <text text="DeepSeek API Key" textSize="14sp" textColor="#716f68"/>
                                <input id="deepseekApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>
                                <text text="DeepSeek 模型" textSize="14sp" textColor="#716f68"/>
                                <input id="deepseekModel" text="" hint="deepseek-chat" marginBottom="12"/>
                            </vertical>

                            <!-- 本地模型配置页 -->
                            <vertical id="cfgPageLocal" visibility="gone">
                                <text text="本地 Base URL" textSize="14sp" textColor="#716f68"/>
                                <input id="localBaseUrl" text="" hint="http://127.0.0.1:8080/v1" marginBottom="8"/>
                                <text text="本地模型名" textSize="14sp" textColor="#716f68"/>
                                <input id="localModel" text="" hint="local" marginBottom="12"/>
                            </vertical>

                            <!-- 通用配置 -->
                            <text text="最大执行步数" textSize="14sp" textColor="#716f68"/>
                            <input id="maxSteps" text="" hint="15" inputType="number" marginBottom="16"/>

                            <horizontal gravity="center">
                                <button id="btnTest" text="测试连接" w="108" marginRight="10" textColor="#24231f" bg="#dfeee7"/>
                                <button id="btnSave" text="保存配置" w="108" textColor="#ffffff" bg="#2f7d62"/>
                            </horizontal>

                            <text id="settingStatus" text="" textSize="12sp" textColor="#b14a42" gravity="center" marginTop="12"/>

                            <!-- 当前配置状态 -->
                            <vertical bg="#ffffff" padding="14" marginTop="16">
                                <text text="当前配置状态" textSize="14sp" textColor="#24231f" textStyle="bold" marginBottom="8"/>
                                <text id="statusProvider" text="提供商: --" textSize="13sp" textColor="#716f68"/>
                                <text id="statusModel" text="模型: --" textSize="13sp" textColor="#716f68"/>
                                <text id="statusKey" text="API Key: --" textSize="13sp" textColor="#716f68"/>
                                <text id="statusSteps" text="最大步数: --" textSize="13sp" textColor="#716f68"/>
                            </vertical>
                        </vertical>
                    </scroll>
                </vertical>

            </frame>

            <!-- ========== 底部导航栏 ========== -->
            <horizontal bg="#ffffff" h="58" elevation="8">
                <horizontal id="navHome" layout_weight="1" gravity="center" bg="#dfeee7">
                    <vertical gravity="center">
                        <text text="H" textSize="16sp" textColor="#20201d" textStyle="bold"/>
                        <text text="Home" textSize="10sp" textColor="#20201d" textStyle="bold"/>
                    </vertical>
                </horizontal>
                <horizontal id="navChat" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="C" textSize="16sp" textColor="#716f68" textStyle="bold"/>
                        <text text="Chat" textSize="10sp" textColor="#716f68"/>
                    </vertical>
                </horizontal>
                <horizontal id="navManage" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="M" textSize="16sp" textColor="#716f68" textStyle="bold"/>
                        <text text="Manage" textSize="10sp" textColor="#716f68"/>
                    </vertical>
                </horizontal>
                <horizontal id="navDocs" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="D" textSize="16sp" textColor="#716f68" textStyle="bold"/>
                        <text text="Docs" textSize="10sp" textColor="#716f68"/>
                    </vertical>
                </horizontal>
                <horizontal id="navSettings" layout_weight="1" gravity="center" bg="#ffffff">
                    <vertical gravity="center">
                        <text text="S" textSize="16sp" textColor="#716f68" textStyle="bold"/>
                        <text text="Settings" textSize="10sp" textColor="#716f68"/>
                    </vertical>
                </horizontal>
            </horizontal>
        </vertical>
    </frame>
);

ui.statusBarColor("#20201d");

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
    var iconView = nav.getChildAt(0).getChildAt(0);
    var textView = nav.getChildAt(0).getChildAt(1);
    iconView.setTextColor(colors.parseColor(active ? NAV_ACTIVE_COLOR : NAV_INACTIVE_COLOR));
    textView.setTextColor(colors.parseColor(active ? NAV_ACTIVE_COLOR : NAV_INACTIVE_COLOR));
    setTextBold(iconView, active);
    setTextBold(textView, active);
}

ui.navHome.click(function () { switchPage("home"); });
ui.navChat.click(function () { switchPage("chat"); });
ui.navManage.click(function () { switchPage("manage"); });
ui.navDocs.click(function () { switchPage("docs"); });
ui.navSettings.click(function () { switchPage("settings"); });

try {
    ui.emitter.on("back_pressed", function (event) {
        if (currentPage !== "home") {
            switchPage("home");
            toast("已返回 Home");
        } else {
            toast("Fold7 Agent 正在运行");
        }
        event.consumed = true;
    });
} catch (e) {
    log("返回键监听设置失败: " + e.message);
}

// ===================== Home 页逻辑 =====================
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
    ui.homeStatSuccess.setText("成功 " + stats.success);
    ui.homeStatFailed.setText("失败 " + stats.failed);
}

ui.btnGoSettings.click(function () {
    switchPage("settings");
});

// ===================== Chat 页逻辑 =====================
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
            if (status.indexOf("成功") >= 0) {
                ui.chatStatus.setTextColor(colors.parseColor(COLOR_SUCCESS));
            } else if (status.indexOf("失败") >= 0) {
                ui.chatStatus.setTextColor(colors.parseColor(COLOR_DANGER));
            } else if (status.indexOf("生成") >= 0 || status.indexOf("理解") >= 0 || status.indexOf("确认") >= 0) {
                ui.chatStatus.setTextColor(colors.parseColor(COLOR_ACCENT));
            } else {
                ui.chatStatus.setTextColor(colors.parseColor(COLOR_MUTED));
            }
        });
    },
    onComplete: function (report) {
        var msg = report.success
            ? "任务执行完成"
            : "任务执行失败: " + (report.error || "未知错误");
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
            bubble.setBackgroundDrawable(makeBubbleBg(COLOR_ACCENT, [24, 24, 4, 4, 24, 24, 24, 24]));
        } else {
            bubble.setTextColor(colors.parseColor(COLOR_INK));
            bubble.setBackgroundDrawable(makeBubbleBg(COLOR_PANEL, [4, 4, 24, 24, 24, 24, 24, 24]));
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
        descText.setText("生成脚本: " + (desc || "生成的脚本"));
        descText.setTextSize(13);
        descText.setTextColor(colors.parseColor(COLOR_MUTED));
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
        preview.setTextColor(colors.parseColor("#4d4b45"));
        preview.setBackgroundDrawable(makeBg("#ebe8df", 8));
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
        btnRun.setText("执行");
        btnRun.setTextSize(13);
        btnRun.setTextColor(colors.parseColor("#ffffff"));
        btnRun.setBackgroundDrawable(makeBg(COLOR_ACCENT, 8));
        btnRun.setPadding(24, 12, 24, 12);

        var btnSave = new android.widget.Button(context);
        btnSave.setText("保存");
        btnSave.setTextSize(13);
        btnSave.setTextColor(colors.parseColor(COLOR_INK));
        btnSave.setBackgroundDrawable(makeBg(COLOR_ACCENT_SOFT, 8));
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

// ===================== Manage 页逻辑 =====================
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
                    empty.setTextColor(colors.parseColor(COLOR_MUTED));
                    empty.setGravity(android.view.Gravity.CENTER);
                    empty.setPadding(0, 48, 0, 0);
                    container.addView(empty);
                    return;
                }

                list.forEach(function (item) {
                    var card = new android.widget.LinearLayout(context);
                    card.setOrientation(android.widget.LinearLayout.VERTICAL);
                    card.setPadding(24, 16, 24, 16);
                    card.setBackgroundDrawable(makeBg(COLOR_PANEL, 12));
                    var lp = new android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                    lp.setMargins(8, 6, 8, 6);
                    card.setLayoutParams(lp);

                    var nameText = new android.widget.TextView(context);
                    nameText.setText(item.name);
                    nameText.setTextSize(14);
                    nameText.setTextColor(colors.parseColor(COLOR_INK));
                    setTextBold(nameText, true);
                    card.addView(nameText);

                    var infoText = new android.widget.TextView(context);
                    infoText.setText(item.size + " 字符");
                    infoText.setTextSize(12);
                    infoText.setTextColor(colors.parseColor(COLOR_MUTED));
                    infoText.setPadding(0, 4, 0, 8);
                    card.addView(infoText);

                    var btnRow = new android.widget.LinearLayout(context);
                    btnRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);

                    var btnRun = new android.widget.Button(context);
                    btnRun.setText("执行");
                    btnRun.setTextSize(11);
                    btnRun.setTextColor(colors.parseColor(COLOR_SUCCESS));
                    btnRun.setBackgroundColor(colors.parseColor(COLOR_PANEL));
                    btnRun.setPadding(16, 8, 16, 8);

                    var btnDel = new android.widget.Button(context);
                    btnDel.setText("删除");
                    btnDel.setTextSize(11);
                    btnDel.setTextColor(colors.parseColor(COLOR_DANGER));
                    btnDel.setBackgroundColor(colors.parseColor(COLOR_PANEL));
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

// ===================== Settings 页逻辑 =====================
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

    ui.tabKimi.setBackgroundColor(colors.parseColor(provider === "kimi" ? COLOR_ACCENT : "#ebe8df"));
    ui.tabKimi.setTextColor(colors.parseColor(provider === "kimi" ? "#ffffff" : COLOR_INK));
    ui.tabDeepSeek.setBackgroundColor(colors.parseColor(provider === "deepseek" ? COLOR_ACCENT : "#ebe8df"));
    ui.tabDeepSeek.setTextColor(colors.parseColor(provider === "deepseek" ? "#ffffff" : COLOR_INK));
    ui.tabLocal.setBackgroundColor(colors.parseColor(provider === "local" ? COLOR_ACCENT : "#ebe8df"));
    ui.tabLocal.setTextColor(colors.parseColor(provider === "local" ? "#ffffff" : COLOR_INK));
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
    ui.statusKey.setText("API Key: " + (hasKey ? "已配置" : "未配置"));
    ui.statusSteps.setText("最大步数: " + (cfg.maxSteps || 15));
}

// 测试连接
ui.btnTest.click(function () {
    ui.settingStatus.setText("正在测试连接...");
    ui.settingStatus.setTextColor(colors.parseColor(COLOR_MUTED));

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
                    ui.settingStatus.setText("API Key 不能为空");
                    ui.settingStatus.setTextColor(colors.parseColor(COLOR_DANGER));
                });
                return;
            }

            var res = ModelClient.testConnection(cfg.provider, cfg.format, providerCfg);
            var statusCode = res ? res.statusCode : 0;
            ui.run(function () {
                if (statusCode >= 200 && statusCode < 300) {
                    ui.settingStatus.setText("连接成功 (" + statusCode + ")");
                    ui.settingStatus.setTextColor(colors.parseColor(COLOR_SUCCESS));
                } else {
                    ui.settingStatus.setText("连接失败: HTTP " + statusCode);
                    ui.settingStatus.setTextColor(colors.parseColor(COLOR_DANGER));
                }
            });
        } catch (e) {
            log("模型测试失败: " + e.message);
            ui.run(function () {
                ui.settingStatus.setText("连接失败: " + e.message);
                ui.settingStatus.setTextColor(colors.parseColor(COLOR_DANGER));
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
        ui.settingStatus.setText("Kimi API Key 不能为空");
        ui.settingStatus.setTextColor(colors.parseColor(COLOR_DANGER));
        return;
    }
    if (activeProvider === "deepseek" && deepseekApiKey.length < 10) {
        ui.settingStatus.setText("DeepSeek API Key 不能为空");
        ui.settingStatus.setTextColor(colors.parseColor(COLOR_DANGER));
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
        toastLog("配置已保存");
        ui.settingStatus.setText("配置已保存");
        ui.settingStatus.setTextColor(colors.parseColor(COLOR_SUCCESS));
        updateSettingStatus();
    } catch (e) {
        ui.settingStatus.setText("保存失败: " + e.message);
        ui.settingStatus.setTextColor(colors.parseColor(COLOR_DANGER));
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
