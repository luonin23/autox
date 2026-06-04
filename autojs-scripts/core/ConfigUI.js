/**
 * 模型配置 UI 页面
 * 基于 AutoX.js ui 模块，在手机上直接可视化配置
 * Kimi / DeepSeek / 本地模型 分标签页配置
 *
 * 用法:
 *   const ConfigUI = require("./core/ConfigUI.js");
 *   ConfigUI.show(); // 弹出配置对话框
 */

function showConfigUI(onSave) {
    onSave = onSave || function () {};

    // 读取当前配置（如果有）
    var current = {};
    try {
        current = require("../config.js");
    } catch (e) {
        current = {
            provider: "kimi",
            kimi: { apiKey: "", model: "kimi-k2-6", url: "" },
            deepseek: { apiKey: "", model: "deepseek-chat", url: "" },
            local: { apiKey: "", model: "local", url: "" },
            maxSteps: 15,
        };
    }

    ui.layout(
        <vertical padding="16">
            <text text="Fold7 Agent 配置" textSize="24sp" textColor="#222222" gravity="center" marginBottom="16"/>

            <!-- 提供商选择标签 -->
            <horizontal gravity="center" marginBottom="12">
                <button id="tabKimi" text="Kimi" w="90" marginRight="4"/>
                <button id="tabDeepSeek" text="DeepSeek" w="90" marginRight="4"/>
                <button id="tabLocal" text="本地" w="90"/>
            </horizontal>

            <!-- Kimi 配置页 -->
            <vertical id="pageKimi" visibility="visible">
                <text text="Kimi API Key" textSize="14sp" textColor="#666666"/>
                <input id="kimiApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>
                <text text="Kimi 模型" textSize="14sp" textColor="#666666"/>
                <input id="kimiModel" text="" hint="kimi-k2-6" marginBottom="12"/>
            </vertical>

            <!-- DeepSeek 配置页 -->
            <vertical id="pageDeepSeek" visibility="gone">
                <text text="DeepSeek API Key" textSize="14sp" textColor="#666666"/>
                <input id="deepseekApiKey" text="" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>
                <text text="DeepSeek 模型" textSize="14sp" textColor="#666666"/>
                <input id="deepseekModel" text="" hint="deepseek-chat" marginBottom="12"/>
            </vertical>

            <!-- 本地模型配置页 -->
            <vertical id="pageLocal" visibility="gone">
                <text text="本地模型地址" textSize="14sp" textColor="#666666"/>
                <input id="localUrl" text="" hint="http://127.0.0.1:8080/v1/chat/completions" marginBottom="8"/>
                <text text="本地模型名" textSize="14sp" textColor="#666666"/>
                <input id="localModel" text="" hint="local" marginBottom="12"/>
            </vertical>

            <!-- 通用配置 -->
            <text text="最大执行步数" textSize="14sp" textColor="#666666"/>
            <input id="maxSteps" text="" hint="15" inputType="number" marginBottom="16"/>

            <horizontal gravity="center">
                <button id="btnTest" text="测试连接" w="100" marginRight="8"/>
                <button id="btnSave" text="保存配置" w="100"/>
                <button id="btnCancel" text="取消" w="100" marginLeft="8"/>
            </horizontal>

            <text id="status" text="" textSize="12sp" textColor="#e74c3c" gravity="center" marginTop="12"/>
        </vertical>
    );

    ui.statusBarColor("#ffffff");

    // 当前选中的 provider
    var activeProvider = current.provider || "kimi";

    // 填充当前配置值
    ui.kimiApiKey.setText(current.kimi.apiKey || "");
    ui.kimiModel.setText(current.kimi.model || "kimi-k2-6");
    ui.deepseekApiKey.setText(current.deepseek.apiKey || "");
    ui.deepseekModel.setText(current.deepseek.model || "deepseek-chat");
    ui.localUrl.setText(current.local.url || "");
    ui.localModel.setText(current.local.model || "local");
    ui.maxSteps.setText(String(current.maxSteps || 15));

    // 标签页切换
    function switchTab(provider) {
        activeProvider = provider;
        ui.pageKimi.setVisibility(provider === "kimi" ? android.view.View.VISIBLE : android.view.View.GONE);
        ui.pageDeepSeek.setVisibility(provider === "deepseek" ? android.view.View.VISIBLE : android.view.View.GONE);
        ui.pageLocal.setVisibility(provider === "local" ? android.view.View.VISIBLE : android.view.View.GONE);

        // 高亮当前标签按钮
        ui.tabKimi.setBackgroundColor(colors.parseColor(provider === "kimi" ? "#1976d2" : "#f0f0f0"));
        ui.tabKimi.setTextColor(colors.parseColor(provider === "kimi" ? "#ffffff" : "#333333"));
        ui.tabDeepSeek.setBackgroundColor(colors.parseColor(provider === "deepseek" ? "#1976d2" : "#f0f0f0"));
        ui.tabDeepSeek.setTextColor(colors.parseColor(provider === "deepseek" ? "#ffffff" : "#333333"));
        ui.tabLocal.setBackgroundColor(colors.parseColor(provider === "local" ? "#1976d2" : "#f0f0f0"));
        ui.tabLocal.setTextColor(colors.parseColor(provider === "local" ? "#ffffff" : "#333333"));
    }

    ui.tabKimi.click(function () { switchTab("kimi"); });
    ui.tabDeepSeek.click(function () { switchTab("deepseek"); });
    ui.tabLocal.click(function () { switchTab("local"); });

    // 初始化标签页
    switchTab(activeProvider);

    // 测试连接
    ui.btnTest.click(function () {
        ui.status.setText("🔄 正在测试连接...");
        threads.start(function () {
            try {
                var res;
                var msg = "";
                if (activeProvider === "kimi") {
                    var key = String(ui.kimiApiKey.getText() || "").trim();
                    var url = "https://api.moonshot.cn/v1/chat/completions";
                    if (key.length < 10) {
                        ui.status.setText("❌ Kimi API Key 不能为空");
                        return;
                    }
                    res = http.postJson(url, {
                        model: "kimi-k2-6",
                        messages: [{ role: "user", content: "hi" }],
                        max_tokens: 1,
                    }, {
                        headers: {
                            "Authorization": "Bearer " + key,
                            "Content-Type": "application/json"
                        },
                        timeout: 15000,
                    });
                } else if (activeProvider === "deepseek") {
                    var key = String(ui.deepseekApiKey.getText() || "").trim();
                    var url = "https://api.deepseek.com/v1/chat/completions";
                    if (key.length < 10) {
                        ui.status.setText("❌ DeepSeek API Key 不能为空");
                        return;
                    }
                    res = http.postJson(url, {
                        model: "deepseek-chat",
                        messages: [{ role: "user", content: "hi" }],
                        max_tokens: 1,
                    }, {
                        headers: {
                            "Authorization": "Bearer " + key,
                            "Content-Type": "application/json"
                        },
                        timeout: 15000,
                    });
                } else {
                    var url = String(ui.localUrl.getText() || "http://127.0.0.1:8080/v1/chat/completions").trim();
                    res = http.get(url.replace("/v1/chat/completions", ""), { timeout: 5000 });
                }

                var statusCode = res ? res.statusCode : 0;
                if (statusCode >= 200 && statusCode < 300) {
                    ui.status.setText("✅ 连接成功 (" + statusCode + ")");
                } else {
                    ui.status.setText("❌ 连接失败: HTTP " + statusCode);
                }
            } catch (e) {
                ui.status.setText("❌ 连接失败: " + e.message);
            }
        });
    });

    // 保存配置
    ui.btnSave.click(function () {
        var kimiApiKey = String(ui.kimiApiKey.getText() || "").trim();
        var kimiModel = String(ui.kimiModel.getText() || "kimi-k2-6").trim();
        var deepseekApiKey = String(ui.deepseekApiKey.getText() || "").trim();
        var deepseekModel = String(ui.deepseekModel.getText() || "deepseek-chat").trim();
        var localUrl = String(ui.localUrl.getText() || "http://127.0.0.1:8080/v1/chat/completions").trim();
        var localModel = String(ui.localModel.getText() || "local").trim();
        var maxSteps = parseInt(String(ui.maxSteps.getText() || "15")) || 15;

        if (activeProvider === "kimi" && kimiApiKey.length < 10) {
            ui.status.setText("❌ Kimi API Key 不能为空");
            return;
        }
        if (activeProvider === "deepseek" && deepseekApiKey.length < 10) {
            ui.status.setText("❌ DeepSeek API Key 不能为空");
            return;
        }

        var configContent =
            'module.exports = {\n' +
            '    provider: "' + activeProvider + '",\n' +
            '\n' +
            '    kimi: {\n' +
            '        apiKey: "' + kimiApiKey + '",\n' +
            '        model: "' + kimiModel + '",\n' +
            '        url: "https://api.moonshot.cn/v1/chat/completions",\n' +
            '    },\n' +
            '\n' +
            '    deepseek: {\n' +
            '        apiKey: "' + deepseekApiKey + '",\n' +
            '        model: "' + deepseekModel + '",\n' +
            '        url: "https://api.deepseek.com/v1/chat/completions",\n' +
            '    },\n' +
            '\n' +
            '    local: {\n' +
            '        apiKey: "",\n' +
            '        model: "' + localModel + '",\n' +
            '        url: "' + localUrl + '",\n' +
            '    },\n' +
            '\n' +
            '    maxSteps: ' + maxSteps + ',\n' +
            '\n' +
            '    delay: {\n' +
            '        min: 500,\n' +
            '        max: 2000,\n' +
            '        wechatMin: 3000,\n' +
            '    },\n' +
            '};\n';

        try {
            var configPath = files.path("/sdcard/AutoX/fold7-agent/autojs-scripts/config.js");
            files.createWithDirs(configPath);
            files.write(configPath, configContent);
            toastLog("✅ 配置已保存");
            ui.finish();
            onSave();
        } catch (e) {
            ui.status.setText("❌ 保存失败: " + e.message);
        }
    });

    ui.btnCancel.click(function () {
        ui.finish();
    });
}

module.exports = { show: showConfigUI };
