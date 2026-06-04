/**
 * 对话界面 UI 模块
 * 基于 AutoX.js ui 模块，提供底部标签页式交互界面
 *
 * 标签页：
 *   - 对话：自然语言输入 → 语义解析 → 任务规划 → 脚本生成 → 执行/保存
 *   - 配置：模型提供商、API Key、模型名称、服务地址等配置
 *
 * 用法:
 *   const ChatUI = require("./core/ChatUI.js");
 *   ChatUI.show();
 */

// ===================== 模块依赖 =====================
const SemanticParser = require("./SemanticParser.js");
const TaskPlanner = require("./TaskPlanner.js");
const ScriptGenerator = require("./ScriptGenerator.js");
const Logger = require("./Logger.js");

// ===================== 常量 =====================
const SAVE_DIR = "/sdcard/AutoX/fold7-agent/scripts/";

// ===================== 工具函数 =====================

/**
 * 读取当前配置
 */
function loadConfig() {
    try {
        return require("../config.js");
    } catch (e) {
        return {
            provider: "kimi",
            kimi: { apiKey: "", model: "kimi-k2-6", url: "" },
            deepseek: { apiKey: "", model: "deepseek-chat", url: "" },
            local: { apiKey: "", model: "local", url: "" },
            maxSteps: 15,
        };
    }
}

/**
 * 生成可执行脚本内容（委托给 ScriptGenerator 模块）
 * 使用 generateInline 生成轻量内联脚本，适合 engines.execScript 直接执行
 */
function generateScript(intention, planSteps) {
    const instruction = intention.raw || "";
    return ScriptGenerator.generateInline(instruction, intention, planSteps);
}

/**
 * 保存脚本到文件
 */
function saveScriptToFile(filename, content) {
    if (!files.exists(SAVE_DIR)) {
        files.createWithDirs(SAVE_DIR);
    }
    const path = files.path(SAVE_DIR + filename);
    files.write(path, content);
    return path;
}

// ===================== UI 构建 =====================

function showChatUI() {
    const current = loadConfig();

    ui.layout(
        <frame>
            <vertical id="mainContainer" bg="#f5f5f5">
                <!-- 标题栏 -->
                <horizontal bg="#ffffff" padding="12 16" elevation="2">
                    <text text="Fold7 Agent" textSize="20sp" textColor="#333333" textStyle="bold"/>
                    <text text="智能对话助手" textSize="12sp" textColor="#999999" marginLeft="8" layout_gravity="center_vertical"/>
                </horizontal>

                <!-- 内容区域 -->
                <frame id="contentFrame" layout_weight="1">

                    <!-- ========== 对话标签页 ========== -->
                    <vertical id="tabChat" visibility="visible">
                        <!-- 消息列表 -->
                        <scroll id="chatScroll" layout_weight="1" padding="8">
                            <vertical id="messageList">
                                <!-- 欢迎消息 -->
                                <horizontal gravity="left" margin="4 8">
                                    <vertical bg="#e8e8e8" padding="12 10" minWidth="60" maxWidth="280">
                                        <text text="你好！我是 Fold7 Agent 智能助手。" textSize="14sp" textColor="#333333"/>
                                        <text text="请输入自然语言指令，例如：" textSize="14sp" textColor="#333333" marginTop="4"/>
                                        <text text="  · 给张三发微信说晚上吃饭" textSize="13sp" textColor="#666666" marginTop="4"/>
                                        <text text="  · 打开钉钉打卡" textSize="13sp" textColor="#666666"/>
                                        <text text="  · 在淘宝搜索蓝牙耳机" textSize="13sp" textColor="#666666"/>
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
                                <button id="btnSend"
                                    text="发送"
                                    style="Widget.AppCompat.Button.Colored"
                                    w="70"
                                    marginLeft="8"
                                    layout_gravity="bottom"/>
                            </horizontal>
                        </vertical>
                    </vertical>

                    <!-- ========== 配置标签页 ========== -->
                    <scroll id="tabConfig" visibility="gone" padding="16">
                        <vertical>
                            <text text="模型配置" textSize="20sp" textColor="#222222" gravity="center" marginBottom="16"/>

                            <text text="模型提供商" textSize="14sp" textColor="#666666"/>
                            <spinner id="provider" entries="Kimi|DeepSeek|本地" marginBottom="12"/>

                            <text text="Kimi API Key" textSize="14sp" textColor="#666666"/>
                            <input id="kimiApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>

                            <text text="Kimi 模型" textSize="14sp" textColor="#666666"/>
                            <input id="kimiModel" text="" hint="kimi-k2-6" marginBottom="12"/>

                            <text text="DeepSeek API Key" textSize="14sp" textColor="#666666"/>
                            <input id="deepseekApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>

                            <text text="DeepSeek 模型" textSize="14sp" textColor="#666666"/>
                            <input id="deepseekModel" text="" hint="deepseek-chat" marginBottom="12"/>

                            <text text="本地模型地址" textSize="14sp" textColor="#666666"/>
                            <input id="localUrl" text="" hint="http://127.0.0.1:8080/v1/chat/completions" marginBottom="8"/>

                            <text text="本地模型名" textSize="14sp" textColor="#666666"/>
                            <input id="localModel" text="" hint="local" marginBottom="12"/>

                            <text text="最大执行步数" textSize="14sp" textColor="#666666"/>
                            <input id="maxSteps" text="" hint="15" inputType="number" marginBottom="16"/>

                            <horizontal gravity="center">
                                <button id="btnTest" text="测试连接" w="100" marginRight="8"/>
                                <button id="btnSaveConfig" text="保存配置" w="100"/>
                            </horizontal>

                            <text id="configStatus" text="" textSize="12sp" textColor="#e74c3c" gravity="center" marginTop="12"/>

                            <!-- 当前配置状态 -->
                            <vertical bg="#f0f0f0" padding="12" marginTop="16" radius="4">
                                <text text="当前配置状态" textSize="14sp" textColor="#333333" textStyle="bold" marginBottom="8"/>
                                <text id="statusProvider" text="提供商: --" textSize="13sp" textColor="#666666"/>
                                <text id="statusModel" text="模型: --" textSize="13sp" textColor="#666666"/>
                                <text id="statusKey" text="API Key: --" textSize="13sp" textColor="#666666"/>
                                <text id="statusSteps" text="最大步数: --" textSize="13sp" textColor="#666666"/>
                            </vertical>
                        </vertical>
                    </scroll>

                    <!-- ========== 历史标签页 ========== -->
                    <vertical id="tabHistory" visibility="gone" layout_weight="1">
                        <vertical bg="#ffffff" padding="12" elevation="2">
                            <text text="📊 执行历史" textSize="18sp" textColor="#222222" gravity="center" marginBottom="8"/>
                            <horizontal gravity="center">
                                <text id="histDate" text="--" textSize="13sp" textColor="#666666" w="80"/>
                                <text id="histSuccess" text="✅ 0" textSize="15sp" textColor="#27ae60" marginLeft="12" w="60"/>
                                <text id="histFailed" text="❌ 0" textSize="15sp" textColor="#e74c3c" marginLeft="8" w="60"/>
                            </horizontal>
                        </vertical>
                        <scroll id="historyScroll" layout_weight="1">
                            <vertical id="historyList" padding="8">
                                <text text="加载中..." textSize="13sp" textColor="#999999" gravity="center" marginTop="16"/>
                            </vertical>
                        </scroll>
                        <horizontal bg="#ffffff" padding="8" gravity="center">
                            <button id="btnRefreshHistory" text="刷新" w="100"/>
                            <button id="btnClearHistory" text="清空显示" w="100" marginLeft="8"/>
                        </horizontal>
                    </vertical>

                </frame>

                <!-- 底部标签栏 -->
                <horizontal bg="#ffffff" elevation="8" h="56">
                    <horizontal id="tabBtnChat" layout_weight="1" gravity="center" bg="#e3f2fd">
                        <text text="对话" textSize="14sp" textColor="#1976d2" textStyle="bold"/>
                    </horizontal>
                    <horizontal id="tabBtnConfig" layout_weight="1" gravity="center" bg="#ffffff">
                        <text text="配置" textSize="14sp" textColor="#666666"/>
                    </horizontal>
                    <horizontal id="tabBtnHistory" layout_weight="1" gravity="center" bg="#ffffff">
                        <text text="历史" textSize="14sp" textColor="#666666"/>
                    </horizontal>
                </horizontal>

            </vertical>
        </frame>
    );

    ui.statusBarColor("#ffffff");

    // ===================== 状态变量 =====================
    let currentTab = "chat";

    // ===================== 配置页初始化 =====================
    // current 已在上面声明，直接复用
    ui.kimiApiKey.setText(current.kimi.apiKey || "");
    ui.kimiModel.setText(current.kimi.model || "kimi-k2-6");
    ui.deepseekApiKey.setText(current.deepseek.apiKey || "");
    ui.deepseekModel.setText(current.deepseek.model || "deepseek-chat");
    ui.localUrl.setText(current.local.url || "");
    ui.localModel.setText(current.local.model || "local");
    ui.maxSteps.setText(String(current.maxSteps || 15));

    if (current.provider === "deepseek") {
        ui.provider.setSelection(1);
    } else if (current.provider === "local") {
        ui.provider.setSelection(2);
    } else {
        ui.provider.setSelection(0);
    }
    updateConfigStatus();

    function updateConfigStatus() {
        const cfg = loadConfig();
        const providerName = cfg.provider === "kimi" ? "Kimi" : (cfg.provider === "deepseek" ? "DeepSeek" : "本地");
        const providerCfg = cfg[cfg.provider] || {};
        const hasKey = providerCfg.apiKey && providerCfg.apiKey.length > 5;
        ui.statusProvider.setText("提供商: " + providerName);
        ui.statusModel.setText("模型: " + (providerCfg.model || "--"));
        ui.statusKey.setText("API Key: " + (hasKey ? "已配置" : "未配置"));
        ui.statusSteps.setText("最大步数: " + (cfg.maxSteps || 15));
    }

    // ===================== 标签切换 =====================
    function switchTab(tab) {
        // 全部隐藏
        ui.tabChat.setVisibility(android.view.View.GONE);
        ui.tabConfig.setVisibility(android.view.View.GONE);
        ui.tabHistory.setVisibility(android.view.View.GONE);
        ui.tabBtnChat.setBackgroundColor(colors.parseColor("#ffffff"));
        ui.tabBtnConfig.setBackgroundColor(colors.parseColor("#ffffff"));
        ui.tabBtnHistory.setBackgroundColor(colors.parseColor("#ffffff"));
        ui.tabBtnChat.getChildAt(0).setTextColor(colors.parseColor("#666666"));
        ui.tabBtnConfig.getChildAt(0).setTextColor(colors.parseColor("#666666"));
        ui.tabBtnHistory.getChildAt(0).setTextColor(colors.parseColor("#666666"));

        if (tab === "chat") {
            ui.tabChat.setVisibility(android.view.View.VISIBLE);
            ui.tabBtnChat.setBackgroundColor(colors.parseColor("#e3f2fd"));
            ui.tabBtnChat.getChildAt(0).setTextColor(colors.parseColor("#1976d2"));
            currentTab = "chat";
        } else if (tab === "config") {
            ui.tabConfig.setVisibility(android.view.View.VISIBLE);
            ui.tabBtnConfig.setBackgroundColor(colors.parseColor("#e3f2fd"));
            ui.tabBtnConfig.getChildAt(0).setTextColor(colors.parseColor("#1976d2"));
            currentTab = "config";
            updateConfigStatus();
        } else if (tab === "history") {
            ui.tabHistory.setVisibility(android.view.View.VISIBLE);
            ui.tabBtnHistory.setBackgroundColor(colors.parseColor("#e3f2fd"));
            ui.tabBtnHistory.getChildAt(0).setTextColor(colors.parseColor("#1976d2"));
            currentTab = "history";
            loadHistory();
        }
    }

    ui.tabBtnChat.click(function () { switchTab("chat"); });
    ui.tabBtnConfig.click(function () { switchTab("config"); });
    ui.tabBtnHistory.click(function () { switchTab("history"); });

    // ===================== 消息渲染 =====================

    /**
     * 添加用户消息（右侧蓝色气泡）
     */
    function addUserMessage(text) {
        ui.run(function () {
            const container = ui.messageList;
            const row = new android.widget.LinearLayout(context);
            row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            row.setGravity(android.view.Gravity.RIGHT);
            row.setPadding(4, 8, 4, 8);

            const bubble = new android.widget.TextView(context);
            bubble.setText(text);
            bubble.setTextSize(14);
            bubble.setTextColor(colors.parseColor("#ffffff"));
            bubble.setBackgroundDrawable(
                new android.graphics.drawable.GradientDrawable()
                    .setCornerRadii([24, 24, 4, 4, 24, 24, 24, 24])
                    .setColor(colors.parseColor("#1976d2"))
            );
            bubble.setPadding(24, 16, 24, 16);
            bubble.setMaxWidth(device.width * 0.7);

            row.addView(bubble);
            container.addView(row);

            // 滚动到底部
            ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
        });
    }

    /**
     * 添加助手消息（左侧灰色气泡）
     */
    function addAssistantMessage(htmlText) {
        ui.run(function () {
            const container = ui.messageList;
            const row = new android.widget.LinearLayout(context);
            row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            row.setGravity(android.view.Gravity.LEFT);
            row.setPadding(4, 8, 4, 8);

            const bubble = new android.widget.TextView(context);
            bubble.setText(android.text.Html.fromHtml(htmlText));
            bubble.setTextSize(14);
            bubble.setTextColor(colors.parseColor("#333333"));
            bubble.setBackgroundDrawable(
                new android.graphics.drawable.GradientDrawable()
                    .setCornerRadii([4, 4, 24, 24, 24, 24, 24, 24])
                    .setColor(colors.parseColor("#e8e8e8"))
            );
            bubble.setPadding(24, 16, 24, 16);
            bubble.setMaxWidth(device.width * 0.75);

            row.addView(bubble);
            container.addView(row);

            ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
        });
    }

    /**
     * 添加思考中提示
     */
    function addThinkingIndicator() {
        const id = "thinking_" + Date.now();
        ui.run(function () {
            const container = ui.messageList;
            const row = new android.widget.LinearLayout(context);
            row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            row.setGravity(android.view.Gravity.LEFT);
            row.setPadding(4, 8, 4, 8);
            row.setTag(id);

            const bubble = new android.widget.TextView(context);
            bubble.setText("思考中...");
            bubble.setTextSize(14);
            bubble.setTextColor(colors.parseColor("#999999"));
            bubble.setBackgroundDrawable(
                new android.graphics.drawable.GradientDrawable()
                    .setCornerRadii([4, 4, 24, 24, 24, 24, 24, 24])
                    .setColor(colors.parseColor("#e8e8e8"))
            );
            bubble.setPadding(24, 16, 24, 16);

            row.addView(bubble);
            container.addView(row);
            ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
        });
        return id;
    }

    /**
     * 移除思考中提示
     */
    function removeThinkingIndicator(id) {
        ui.run(function () {
            const container = ui.messageList;
            for (let i = container.getChildCount() - 1; i >= 0; i--) {
                const child = container.getChildAt(i);
                if (child.getTag && child.getTag() === id) {
                    container.removeView(child);
                    break;
                }
            }
        });
    }

    /**
     * 添加带按钮的助手响应
     */
    function addAssistantResponseWithActions(intention, planSteps, scriptContent) {
        const thisScript = scriptContent;
        const thisFilename = "script_" + Date.now() + ".js";

        const intentStr = JSON.stringify(intention, null, 2)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const planStr = JSON.stringify(planSteps, null, 2)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const scriptPreview = scriptContent.substring(0, 800)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>");
        const truncated = scriptContent.length > 800 ? "<br/><i>... (脚本已截断，共 " + scriptContent.length + " 字符)</i>" : "";

        const html =
            '<b>意图解析</b><br/>' +
            '<pre style="background:#f5f5f5;padding:8px;border-radius:4px;font-size:11sp;color:#333;">' + intentStr + '</pre><br/>' +
            '<b>执行计划</b> (' + planSteps.length + ' 步)<br/>' +
            '<pre style="background:#f5f5f5;padding:8px;border-radius:4px;font-size:11sp;color:#333;">' + planStr + '</pre><br/>' +
            '<b>脚本预览</b><br/>' +
            '<pre style="background:#f5f5f5;padding:8px;border-radius:4px;font-size:10sp;color:#555;">' + scriptPreview + truncated + '</pre><br/>' +
            '<font color="#1976d2">点击下方按钮执行或保存脚本</font>';

        addAssistantMessage(html);

        // 添加操作按钮行（脚本内容通过闭包绑定到按钮，避免共享变量竞态）
        ui.run(function () {
            const container = ui.messageList;
            const row = new android.widget.LinearLayout(context);
            row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            row.setGravity(android.view.Gravity.LEFT);
            row.setPadding(4, 4, 4, 12);

            const btnRun = new android.widget.Button(context);
            btnRun.setText("执行");
            btnRun.setTextSize(13);
            btnRun.setTextColor(colors.parseColor("#ffffff"));
            btnRun.setBackgroundDrawable(
                new android.graphics.drawable.GradientDrawable()
                    .setCornerRadius(8)
                    .setColor(colors.parseColor("#4caf50"))
            );
            btnRun.setPadding(24, 12, 24, 12);

            const btnSave = new android.widget.Button(context);
            btnSave.setText("保存脚本");
            btnSave.setTextSize(13);
            btnSave.setTextColor(colors.parseColor("#ffffff"));
            btnSave.setBackgroundDrawable(
                new android.graphics.drawable.GradientDrawable()
                    .setCornerRadius(8)
                    .setColor(colors.parseColor("#1976d2"))
            );
            btnSave.setPadding(24, 12, 24, 12);
            btnSave.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ));
            const lp = btnSave.getLayoutParams();
            lp.leftMargin = 16;
            btnSave.setLayoutParams(lp);

            btnRun.setOnClickListener(new android.view.View.OnClickListener({
                onClick: function () {
                    threads.start(function () {
                        try {
                            toastLog("开始执行脚本...");
                            engines.execScript("fold7_generated", thisScript);
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
                            const path = saveScriptToFile(thisFilename, thisScript);
                            ui.run(function () {
                                toastLog("脚本已保存: " + path);
                            });
                        } catch (e) {
                            ui.run(function () {
                                toastLog("保存失败: " + e.message);
                            });
                        }
                    });
                }
            }));

            row.addView(btnRun);
            row.addView(btnSave);
            container.addView(row);
            ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
        });
    }

    // ===================== 发送按钮 =====================
    ui.btnSend.click(function () {
        const text = String(ui.chatInput.getText() || "").trim();
        if (!text) {
            toastLog("请输入指令");
            return;
        }

        ui.chatInput.setText("");
        addUserMessage(text);

        const thinkingId = addThinkingIndicator();

        threads.start(function () {
            try {
                // a. 语义解析
                const intention = SemanticParser.parse(text);
                sleep(300);

                // b. 任务规划
                const planSteps = TaskPlanner.plan(intention);
                sleep(300);

                // c. 生成脚本
                const scriptContent = generateScript(intention, planSteps);

                // d. 移除思考提示，显示结果
                ui.run(function () {
                    removeThinkingIndicator(thinkingId);
                    addAssistantResponseWithActions(intention, planSteps, scriptContent);
                });
            } catch (e) {
                ui.run(function () {
                    removeThinkingIndicator(thinkingId);
                    addAssistantMessage('<font color="#e74c3c">处理出错: ' + e.message + '</font>');
                });
            }
        });
    });

    // ===================== 配置页：测试连接 =====================
    ui.btnTest.click(function () {
        const pos = ui.provider.getSelectedItemPosition();
        const provider = pos === 0 ? "kimi" : (pos === 1 ? "deepseek" : "local");
        const apiKey = provider === "kimi"
            ? String(ui.kimiApiKey.getText() || "").trim()
            : (provider === "deepseek" ? String(ui.deepseekApiKey.getText() || "").trim() : "");
        const url = provider === "kimi"
            ? "https://api.moonshot.cn/v1/chat/completions"
            : (provider === "deepseek"
                ? "https://api.deepseek.com/v1/chat/completions"
                : String(ui.localUrl.getText() || "http://127.0.0.1:8080/v1/chat/completions").trim());

        ui.configStatus.setText("正在测试连接...");
        threads.start(function () {
            try {
                let res;
                if (provider === "kimi") {
                    res = http.postJson(url, {
                        model: "kimi-k2-6",
                        messages: [{ role: "user", content: "hi" }],
                        max_tokens: 1,
                    }, {
                        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
                        timeout: 15000,
                    });
                } else if (provider === "deepseek") {
                    res = http.postJson(url, {
                        model: "deepseek-chat",
                        messages: [{ role: "user", content: "hi" }],
                        max_tokens: 1,
                    }, {
                        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
                        timeout: 15000,
                    });
                } else {
                    res = http.get(url.replace("/v1/chat/completions", ""), { timeout: 5000 });
                }

                ui.run(function () {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        ui.configStatus.setText("连接成功 (" + res.statusCode + ")");
                        ui.configStatus.setTextColor(colors.parseColor("#4caf50"));
                    } else {
                        ui.configStatus.setText("连接失败: HTTP " + res.statusCode);
                        ui.configStatus.setTextColor(colors.parseColor("#e74c3c"));
                    }
                });
            } catch (e) {
                ui.run(function () {
                    ui.configStatus.setText("连接失败: " + e.message);
                    ui.configStatus.setTextColor(colors.parseColor("#e74c3c"));
                });
            }
        });
    });

    // ===================== 配置页：保存配置 =====================
    ui.btnSaveConfig.click(function () {
        const pos = ui.provider.getSelectedItemPosition();
        const provider = pos === 0 ? "kimi" : (pos === 1 ? "deepseek" : "local");
        const kimiApiKey = String(ui.kimiApiKey.getText() || "").trim();
        const kimiModel = String(ui.kimiModel.getText() || "kimi-k2-6").trim();
        const deepseekApiKey = String(ui.deepseekApiKey.getText() || "").trim();
        const deepseekModel = String(ui.deepseekModel.getText() || "deepseek-chat").trim();
        const localUrl = String(ui.localUrl.getText() || "http://127.0.0.1:8080/v1/chat/completions").trim();
        const localModel = String(ui.localModel.getText() || "local").trim();
        const maxSteps = parseInt(String(ui.maxSteps.getText() || "15")) || 15;

        if (provider === "kimi" && kimiApiKey.length < 10) {
            ui.configStatus.setText("Kimi API Key 不能为空");
            ui.configStatus.setTextColor(colors.parseColor("#e74c3c"));
            return;
        }
        if (provider === "deepseek" && deepseekApiKey.length < 10) {
            ui.configStatus.setText("DeepSeek API Key 不能为空");
            ui.configStatus.setTextColor(colors.parseColor("#e74c3c"));
            return;
        }

        const configObj = {
            provider: provider,
            kimi: {
                apiKey: kimiApiKey,
                model: kimiModel,
                url: "https://api.moonshot.cn/v1/chat/completions",
            },
            deepseek: {
                apiKey: deepseekApiKey,
                model: deepseekModel,
                url: "https://api.deepseek.com/v1/chat/completions",
            },
            local: {
                apiKey: "",
                model: localModel,
                url: localUrl,
            },
            maxSteps: maxSteps,
            delay: {
                min: 500,
                max: 2000,
                wechatMin: 3000,
            },
        };
        const configContent = 'module.exports = ' + JSON.stringify(configObj, null, 4) + ';\n';

        try {
            const configPath = files.path("/sdcard/AutoX/fold7-agent/autojs-scripts/config.js");
            files.createWithDirs(configPath);
            files.write(configPath, configContent);
            ui.configStatus.setText("配置已保存");
            ui.configStatus.setTextColor(colors.parseColor("#4caf50"));
            toastLog("配置已保存");
            updateConfigStatus();
        } catch (e) {
            ui.configStatus.setText("保存失败: " + e.message);
            ui.configStatus.setTextColor(colors.parseColor("#e74c3c"));
        }
    });

    // ===================== 历史页：加载历史记录 =====================
    function loadHistory() {
        threads.start(function () {
            try {
                const stats = Logger.todayStats();
                const records = Logger.readRecent(30);

                ui.run(function () {
                    ui.histDate.setText("📅 " + stats.date);
                    ui.histSuccess.setText("✅ " + stats.success);
                    ui.histFailed.setText("❌ " + stats.failed);

                    const container = ui.historyList;
                    container.removeAllViews();

                    if (records.length === 0) {
                        const emptyText = new android.widget.TextView(context);
                        emptyText.setText("暂无执行记录");
                        emptyText.setTextSize(13);
                        emptyText.setTextColor(colors.parseColor("#999999"));
                        emptyText.setGravity(android.view.Gravity.CENTER);
                        emptyText.setPadding(0, 32, 0, 0);
                        container.addView(emptyText);
                        return;
                    }

                    records.slice().reverse().forEach(function (r) {
                        const time = r.timestamp ? r.timestamp.substring(11, 19) : "?";
                        let color = "#333333";
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

                        const card = new android.widget.LinearLayout(context);
                        card.setOrientation(android.widget.LinearLayout.VERTICAL);
                        card.setPadding(24, 16, 24, 16);
                        card.setBackgroundDrawable(
                            new android.graphics.drawable.GradientDrawable()
                                .setCornerRadius(12)
                                .setColor(colors.parseColor("#f8f9fa"))
                        );
                        const lp = new android.widget.LinearLayout.LayoutParams(
                            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        );
                        lp.setMargins(8, 6, 8, 6);
                        card.setLayoutParams(lp);

                        const textView = new android.widget.TextView(context);
                        textView.setText(icon + " [" + time + "] " + summary);
                        textView.setTextSize(12);
                        textView.setTextColor(colors.parseColor(color));
                        card.addView(textView);
                        container.addView(card);
                    });
                });
            } catch (e) {
                log("加载历史失败: " + e.message);
            }
        });
    }

    ui.btnRefreshHistory.click(function () {
        loadHistory();
        toastLog("历史记录已刷新");
    });

    ui.btnClearHistory.click(function () {
        ui.run(function () {
            const container = ui.historyList;
            container.removeAllViews();
            const emptyText = new android.widget.TextView(context);
            emptyText.setText("显示已清空（实际记录未删除）");
            emptyText.setTextSize(13);
            emptyText.setTextColor(colors.parseColor("#999999"));
            emptyText.setGravity(android.view.Gravity.CENTER);
            emptyText.setPadding(0, 32, 0, 0);
            container.addView(emptyText);
        });
        toastLog("显示已清空");
    });
}

module.exports = { show: showChatUI };
