/**
 * ChatUI — 对话界面（v2 架构）
 *
 * v2 变更：
 * - 不再使用 SemanticParser + TaskPlanner 硬编码管道
 * - 委托给 ChatEngine 管理完整的 生成→执行→调试 闭环
 * - UI 只负责：消息展示、用户输入、脚本展示、日志展示、状态展示
 */

"ui";

var ChatUI = (function () {
    var ChatEngine = require("../agent/ChatEngine.js");
    var Logger = require("./Logger.js");

    var SAVE_DIR = "/sdcard/AutoX/fold7-agent/scripts/";

    function showChatUI() {
        ui.layout(
            <frame>
                <vertical id="mainContainer" bg="#f5f5f5">
                    <!-- 标题栏 -->
                    <horizontal bg="#ffffff" padding="12 16" elevation="2">
                        <text text="Fold7 Agent" textSize="20sp" textColor="#333333" textStyle="bold"/>
                        <text text="AI 脚本助手" textSize="12sp" textColor="#999999" marginLeft="8" layout_gravity="center_vertical"/>
                    </horizontal>

                    <!-- 状态栏 -->
                    <horizontal bg="#e3f2fd" padding="8 10" gravity="center_vertical">
                        <text id="statusText" text="就绪" textSize="12sp" textColor="#1976d2" layout_weight="1"/>
                        <button id="btnStop" text="停止" textSize="11sp" textColor="#e74c3c" bg="#ffffff" w="60" h="36"/>
                    </horizontal>

                    <!-- 内容区域 -->
                    <frame id="contentFrame" layout_weight="1">
                        <!-- 对话标签页 -->
                        <vertical id="tabChat" visibility="visible">
                            <scroll id="chatScroll" layout_weight="1" padding="8">
                                <vertical id="messageList">
                                    <horizontal gravity="left" margin="4 8">
                                        <vertical bg="#e8e8e8" padding="12 10" minWidth="60" maxWidth="300">
                                            <text text="你好！我是 Fold7 Agent 智能助手。" textSize="14sp" textColor="#333333"/>
                                            <text text="请告诉我您想要做什么，例如：" textSize="14sp" textColor="#333333" marginTop="4"/>
                                            <text text="  · 给张三发微信说晚上吃饭" textSize="13sp" textColor="#666666" marginTop="4"/>
                                            <text text="  · 打开钉钉打卡" textSize="13sp" textColor="#666666"/>
                                            <text text="  · 每天早上7:15在飞书打卡" textSize="13sp" textColor="#666666"/>
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
                                        w="70"
                                        marginLeft="8"
                                        layout_gravity="bottom"/>
                                </horizontal>
                            </vertical>
                        </vertical>
                    </vertical>
                </vertical>
            </frame>
        );

        ui.statusBarColor("#ffffff");

        // 创建对话引擎
        var engine = ChatEngine.create({
            onMessage: function (msg) {
                addAssistantMessage(msg);
            },
            onScript: function (code, desc) {
                addScriptCard(code, desc);
            },
            onLog: function (line) {
                // 日志在行内展示，或者可以额外展示
                // 这里暂不逐行展示，避免刷屏
            },
            onStatus: function (status) {
                ui.run(function () {
                    ui.statusText.setText(status);
                    if (status.indexOf("✅") >= 0) {
                        ui.statusText.setTextColor(colors.parseColor("#27ae60"));
                    } else if (status.indexOf("❌") >= 0 || status.indexOf("失败") >= 0) {
                        ui.statusText.setTextColor(colors.parseColor("#e74c3c"));
                    } else if (status.indexOf("🧠") >= 0) {
                        ui.statusText.setTextColor(colors.parseColor("#1976d2"));
                    } else {
                        ui.statusText.setTextColor(colors.parseColor("#666666"));
                    }
                });
            },
            onComplete: function (report) {
                var msg = report.success
                    ? "✅ 任务执行完成"
                    : "❌ 任务执行失败: " + (report.error || "未知错误");
                addAssistantMessage(msg);
                ui.run(function () {
                    ui.statusText.setText(report.success ? "就绪" : "执行失败");
                });
            },
        });

        // 停止按钮
        ui.btnStop.click(function () {
            engine.stop();
            toastLog("已停止当前任务");
        });

        // 发送按钮
        ui.btnSend.click(function () {
            var text = String(ui.chatInput.getText() || "").trim();
            if (!text) {
                toastLog("请输入指令");
                return;
            }
            ui.chatInput.setText("");
            addUserMessage(text);
            engine.send(text);
        });

        // ========== 消息渲染工具函数 ==========

        function addUserMessage(text) {
            ui.run(function () {
                var container = ui.messageList;
                var row = new android.widget.LinearLayout(context);
                row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                row.setGravity(android.view.Gravity.RIGHT);
                row.setPadding(4, 8, 4, 8);

                var bubble = new android.widget.TextView(context);
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
                ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
            });
        }

        function addAssistantMessage(text) {
            ui.run(function () {
                var container = ui.messageList;
                var row = new android.widget.LinearLayout(context);
                row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                row.setGravity(android.view.Gravity.LEFT);
                row.setPadding(4, 8, 4, 8);

                var bubble = new android.widget.TextView(context);
                bubble.setText(text);
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
         * 添加脚本卡片（带执行和保存按钮）
         */
        function addScriptCard(code, desc) {
            var filename = "script_" + Date.now() + ".js";

            ui.run(function () {
                var container = ui.messageList;

                // 描述文本
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

                // 脚本预览框
                var previewRow = new android.widget.LinearLayout(context);
                previewRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                previewRow.setGravity(android.view.Gravity.LEFT);
                previewRow.setPadding(4, 4, 4, 4);

                var preview = new android.widget.TextView(context);
                var previewText = code.substring(0, 600).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                if (code.length > 600) previewText += "\n... (共 " + code.length + " 字符)";
                preview.setText(previewText);
                preview.setTextSize(11);
                preview.setTextColor(colors.parseColor("#555555"));
                preview.setBackgroundDrawable(
                    new android.graphics.drawable.GradientDrawable()
                        .setCornerRadius(8)
                        .setColor(colors.parseColor("#f0f0f0"))
                );
                preview.setPadding(16, 12, 16, 12);
                preview.setMaxWidth(device.width * 0.85);

                previewRow.addView(preview);
                container.addView(previewRow);

                // 操作按钮
                var btnRow = new android.widget.LinearLayout(context);
                btnRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                btnRow.setGravity(android.view.Gravity.LEFT);
                btnRow.setPadding(4, 4, 4, 12);

                var btnRun = new android.widget.Button(context);
                btnRun.setText("▶ 执行");
                btnRun.setTextSize(13);
                btnRun.setTextColor(colors.parseColor("#ffffff"));
                btnRun.setBackgroundDrawable(
                    new android.graphics.drawable.GradientDrawable()
                        .setCornerRadius(8)
                        .setColor(colors.parseColor("#4caf50"))
                );
                btnRun.setPadding(24, 12, 24, 12);

                var btnSave = new android.widget.Button(context);
                btnSave.setText("💾 保存");
                btnSave.setTextSize(13);
                btnSave.setTextColor(colors.parseColor("#ffffff"));
                btnSave.setBackgroundDrawable(
                    new android.graphics.drawable.GradientDrawable()
                        .setCornerRadius(8)
                        .setColor(colors.parseColor("#1976d2"))
                );
                btnSave.setPadding(24, 12, 24, 12);
                var lpSave = new android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                );
                lpSave.leftMargin = 16;
                btnSave.setLayoutParams(lpSave);

                // 使用闭包绑定脚本内容，避免变量竞态
                (function (scriptCode, scriptFile) {
                    btnRun.setOnClickListener(new android.view.View.OnClickListener({
                        onClick: function () {
                            threads.start(function () {
                                try {
                                    engine.execute(scriptCode, "用户手动执行");
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
                                    if (!files.exists(SAVE_DIR)) {
                                        files.createWithDirs(SAVE_DIR);
                                    }
                                    var path = files.path(SAVE_DIR + scriptFile);
                                    files.write(path, scriptCode);
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
                })(code, filename);

                btnRow.addView(btnRun);
                btnRow.addView(btnSave);
                container.addView(btnRow);

                ui.chatScroll.fullScroll(android.view.View.FOCUS_DOWN);
            });
        }
    }

    return {
        show: showChatUI,
    };
})();

module.exports = ChatUI;
