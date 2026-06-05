package com.fold7.agent.core;

import com.fold7.agent.Fold7AccessibilityService;
import org.json.JSONObject;

public class RuntimeAgent {
    private final ModelClient model;
    private final ActionExecutor executor;

    public RuntimeAgent(ModelClient model, ActionExecutor executor) {
        this.model = model;
        this.executor = executor;
    }

    public String execute(String request, JSONObject plan) throws Exception {
        StringBuilder transcript = new StringBuilder();
        String last = "none";
        int failures = 0;
        int max = 12;
        for (int i = 0; i < max; i++) {
            String observation = observe();
            String image = screenshot();
            String prompt = userPrompt(request, plan, observation, transcript.toString(), last, image.length() > 0);
            String decisionText;
            if (image.length() > 0) {
                try {
                    decisionText = model.completeWithImage(systemPrompt(), prompt, image);
                } catch (Exception e) {
                    LogStore.add("ERR", "vision model call failed, fallback to text: " + e.getMessage());
                    decisionText = model.complete(systemPrompt(), userPrompt(request, plan, observation, transcript.toString(), last, false));
                }
            } else {
                decisionText = model.complete(systemPrompt(), prompt);
            }
            JSONObject decision = ChatEngine.extractJson(decisionText);
            String status = decision.optString("status", "continue");
            String reason = decision.optString("reason", "");
            LogStore.add("AI", "step " + (i + 1) + " " + status + " " + reason);
            if ("done".equals(status)) {
                return transcript.append(i + 1).append(". done ").append(reason).append("\n").toString();
            }
            if ("error".equals(status)) {
                throw new Exception("运行时 AI 判断失败：" + reason);
            }
            JSONObject action = decision.optJSONObject("action");
            if (action == null) throw new Exception("运行时 AI 未返回 action");
            try {
                String result = executor.executeOne(action);
                failures = 0;
                last = action.toString();
                transcript.append(i + 1).append(". ").append(result).append("  ").append(reason).append("\n");
            } catch (Exception e) {
                failures++;
                last = "failed action=" + action.toString() + " error=" + e.getMessage();
                transcript.append(i + 1).append(". failed ").append(e.getMessage()).append("  ").append(reason).append("\n");
                LogStore.add("ERR", "runtime step failed, asking AI to recover: " + e.getMessage());
                if (failures >= 3) throw new Exception("连续执行失败：" + e.getMessage());
            }
            Thread.sleep(400);
        }
        throw new Exception("运行时 AI 超过最大步数仍未完成");
    }

    private String observe() {
        Fold7AccessibilityService service = Fold7AccessibilityService.instance();
        if (service == null) return "accessibility_service: disconnected";
        return service.snapshot();
    }

    private String screenshot() {
        Fold7AccessibilityService service = Fold7AccessibilityService.instance();
        if (service == null) return "";
        return service.screenshotBase64();
    }

    private String systemPrompt() {
        return "你是 Fold7 Agent 的运行时页面导航 Agent。你不是一次性写脚本，而是在每一步根据当前手机页面决定下一步动作。返回严格 JSON，不要输出多余文字。格式：{\"status\":\"continue|done|error\",\"reason\":\"...\",\"action\":{...}}。可用 action：open_app(package/appName), open_settings, tap_text(text,timeoutMs), tap_xy(x,y), input_text(text,timeoutMs), wait(ms), back, home。优先 tap_text/input_text/back/home。页面不在目标位置时，先用 back 或 home 回到稳定入口，再继续。找不到元素时不要假装成功，返回 error 或选择合理的恢复动作。";
    }

    private String userPrompt(String request, JSONObject plan, String observation, String history, String lastAction, boolean hasImage) {
        return "用户原始目标：\n" + request
            + "\n\n高层动作计划：\n" + plan.toString()
            + "\n\n当前页面观察：\n" + observation
            + "\n\n截图：\n" + (hasImage ? "已附加当前手机截图，请优先根据截图判断页面状态。" : "当前无法截图，请根据页面观察判断。")
            + "\n\n已执行历史：\n" + history
            + "\n\n上一步动作或失败：\n" + lastAction
            + "\n\n请判断现在页面应该做什么。如果上一步失败，不要重复同一个失败动作，必须选择恢复路径，例如 back、home、点击搜索入口、或寻找页面上实际存在的文字。若目标已经完成，返回 done。若当前页面明显无法继续且无法恢复，返回 error。";
    }
}
