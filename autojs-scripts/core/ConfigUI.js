/**
 * 模型配置 UI 页面
 * 基于 AutoX.js ui 模块，在手机上直接可视化配置
 *
 * 用法:
 *   const ConfigUI = require("./core/ConfigUI.js");
 *   ConfigUI.show(); // 弹出配置对话框
 */

function showConfigUI(onSave) {
    onSave = onSave || function () {};

    // 读取当前配置（如果有）
    let current = {};
    try {
        current = require("../config.js");
    } catch (e) {
        current = {
            provider: "kimi",
            kimi: { apiKey: "", model: "kimi-k2-6", url: "" },
            local: { apiKey: "", model: "local", url: "" },
            maxSteps: 15,
        };
    }

    ui.layout(
        <vertical padding="16">
            <text text="Fold7 Agent 配置" textSize="24sp" textColor="#222" gravity="center" marginBottom="16"/>

            <text text="模型提供商" textSize="14sp" textColor="#666"/>
            <spinner id="provider" entries="Kimi (Moonshot)|本地 llama.cpp" marginBottom="12"/>

            <text text="Kimi API Key" textSize="14sp" textColor="#666"/>
            <input id="kimiApiKey" text="{{current.kimi.apiKey}}" hint="sk-xxxxxxxx" inputType="textPassword" marginBottom="8"/>

            <text text="Kimi 模型" textSize="14sp" textColor="#666"/>
            <input id="kimiModel" text="{{current.kimi.model || 'kimi-k2-6'}}" hint="kimi-k2-6" marginBottom="12"/>

            <text text="本地模型地址" textSize="14sp" textColor="#666"/>
            <input id="localUrl" text="{{current.local.url}}" hint="http://127.0.0.1:8080/v1/chat/completions" marginBottom="8"/>

            <text text="本地模型名" textSize="14sp" textColor="#666"/>
            <input id="localModel" text="{{current.local.model || 'local'}}" hint="local" marginBottom="12"/>

            <text text="最大执行步数" textSize="14sp" textColor="#666"/>
            <input id="maxSteps" text="{{String(current.maxSteps || 15)}}" hint="15" inputType="number" marginBottom="16"/>

            <horizontal gravity="center">
                <button id="btnSave" text="保存配置" style="Widget.AppCompat.Button.Colored" w="120"/>
                <button id="btnCancel" text="取消" w="120" marginLeft="16"/>
            </horizontal>

            <text id="status" text="" textSize="12sp" textColor="#e74c3c" gravity="center" marginTop="12"/>
        </vertical>
    );

    ui.statusBarColor("#ffffff");

    // 设置当前选中项
    if (current.provider === "local") {
        ui.provider.setSelection(1);
    } else {
        ui.provider.setSelection(0);
    }

    ui.btnSave.click(function () {
        const provider = ui.provider.getSelectedItemPosition() === 0 ? "kimi" : "local";
        const kimiApiKey = String(ui.kimiApiKey.getText() || "").trim();
        const kimiModel = String(ui.kimiModel.getText() || "kimi-k2-6").trim();
        const localUrl = String(ui.localUrl.getText() || "http://127.0.0.1:8080/v1/chat/completions").trim();
        const localModel = String(ui.localModel.getText() || "local").trim();
        const maxSteps = parseInt(String(ui.maxSteps.getText() || "15")) || 15;

        if (provider === "kimi" && kimiApiKey.length < 10) {
            ui.status.setText("❌ Kimi API Key 不能为空");
            return;
        }

        const configContent =
            'module.exports = {\n' +
            '    provider: "' + provider + '",\n' +
            '\n' +
            '    kimi: {\n' +
            '        apiKey: "' + kimiApiKey + '",\n' +
            '        model: "' + kimiModel + '",\n' +
            '        url: "https://api.moonshot.cn/v1/chat/completions",\n' +
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
            const configPath = files.path("./config.js");
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
