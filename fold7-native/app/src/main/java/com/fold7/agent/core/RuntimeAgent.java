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
        int max = 12;
        for (int i = 0; i < max; i++) {
            String observation = observe();
            String decisionText = model.complete(systemPrompt(), userPrompt(request, plan, observation, transcript.toString(), last));
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
            String result = executor.executeOne(action);
            last = action.toString();
            transcript.append(i + 1).append(". ").append(result).append("  ").append(reason).append("\n");
            Thread.sleep(400);
        }
        throw new Exception("运行时 AI 超过最大步数仍未完成");
    }

    private String observe() {
        Fold7AccessibilityService service = Fold7AccessibilityService.instance();
        if (service == null) return "accessibility_service: disconnected";
        return service.snapshot();
    }

    private String systemPrompt() {
        return "你是 Fold7 Agent 的运行时页面导航 Agent。你不是一次性写脚本，而是在每一步根据当前手机页面决定下一步动作。返回严格 JSON，不要输出多余文字。格式：{\"status\":\"continue|done|error\",\"reason\":\"...\",\"action\":{...}}。可用 action：open_app(package/appName), open_settings, tap_text(text,timeoutMs), tap_xy(x,y), input_text(text,timeoutMs), wait(ms), back, home。优先 tap_text/input_text/back/home。页面不在目标位置时，先用 back 或 home 回到稳定入口，再继续。找不到元素时不要假装成功，返回 error 或选择合理的恢复动作。";
    }

    private String userPrompt(String request, JSONObject plan, String observation, String history, String lastAction) {
        return "用户原始目标：\n" + request
            + "\n\n高层动作计划：\n" + plan.toString()
            + "\n\n当前页面观察：\n" + observation
            + "\n\n已执行历史：\n" + history
            + "\n\n上一步动作：\n" + lastAction
            + "\n\n请判断现在页面应该做什么。若目标已经完成，返回 done。若当前页面明显无法继续且无法恢复，返回 error。";
    }
}
