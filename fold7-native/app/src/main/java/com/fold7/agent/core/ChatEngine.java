package com.fold7.agent.core;

import org.json.JSONArray;
import org.json.JSONObject;

public class ChatEngine {
    private final ModelClient model;
    private final TaskStore tasks;
    private String pendingRequest = "";
    private String pendingConfirmation = "";
    private JSONObject pendingPlan = null;
    private String pendingPlanRequest = "";
    private String pendingTaskId = "";
    private String taskMode = "normal";

    public ChatEngine(ModelClient model, TaskStore tasks) {
        this.model = model;
        this.tasks = tasks;
    }

    public boolean waitingConfirmation() {
        return pendingRequest.length() > 0;
    }

    public boolean hasPendingPlan() {
        return pendingPlan != null;
    }

    public String pendingTaskId() {
        return pendingTaskId;
    }

    public void clearPendingPlan() {
        pendingPlan = null;
        pendingPlanRequest = "";
        pendingTaskId = "";
    }

    public void setTaskMode(String mode) {
        if ("timed".equals(mode) || "loop".equals(mode)) taskMode = mode;
        else taskMode = "normal";
    }

    public String handle(String input, ActionExecutor executor) throws Exception {
        if (hasPendingPlan() && isExecute(input)) {
            return executePending(executor);
        }
        if (hasPendingPlan()) {
            pendingPlan = null;
            pendingPlanRequest = "";
            pendingTaskId = "";
        }
        if (waitingConfirmation()) {
            if (isConfirm(input)) {
                String request = pendingRequest;
                try {
                    String plan = model.complete(generateSystem(), request + "\n\n用户已确认意图，请生成动作计划 JSON。");
                    JSONObject json = extractJson(plan);
                    pendingPlan = json;
                    pendingPlanRequest = request;
                    pendingTaskId = tasks.savePlan(request, json, taskMode);
                    pendingRequest = "";
                    pendingConfirmation = "";
                    String modeHint = "normal".equals(taskMode) ? "" : "\n这是" + ("timed".equals(taskMode) ? "定时任务" : "循环任务") + "，请到 Manage 中设置启动时间和执行次数。";
                    return "动作计划已生成，尚未执行，已保存到 Manage。\n\n" + summarize(json) + modeHint + "\n请点击“执行”或输入“执行”后，我才会开始运行。";
                } catch (Exception e) {
                    reset();
                    throw e;
                }
            }
            pendingRequest = input;
        } else {
            pendingRequest = input;
        }
        String reply = model.complete(confirmSystem(), pendingRequest);
        JSONObject json = extractJson(reply);
        pendingConfirmation = readableConfirmation(json);
        return pendingConfirmation;
    }

    public String executePending(ActionExecutor executor) throws Exception {
        if (pendingPlan == null) return "当前没有待执行的动作计划。";
        JSONObject plan = pendingPlan;
        String request = pendingPlanRequest;
        try {
            String result = new RuntimeAgent(model, executor).execute(request, plan);
            LogStore.task("AI runtime executed: " + request);
            if (pendingTaskId.length() > 0) tasks.updateExecution(pendingTaskId, "done", result);
            pendingPlan = null;
            pendingPlanRequest = "";
            pendingTaskId = "";
            return "已执行动作计划。\n\n" + summarize(plan) + "\n\n执行结果：\n" + result;
        } catch (Exception e) {
            if (pendingTaskId.length() > 0) tasks.updateExecution(pendingTaskId, "failed", e.getMessage());
            pendingPlan = null;
            pendingPlanRequest = "";
            pendingTaskId = "";
            throw e;
        }
    }

    public String demoConfirm(String input) {
        pendingRequest = input;
        pendingConfirmation = "我收到的用户请求原话是：\"" + input + "\"\n\n经过拆解，我理解你希望我：\n1. 打开系统设置。\n2. 确认设置页面可以被正常启动。\n3. 返回桌面。\n\n请确认我的理解是否正确。如果正确，请回复“正确”；如果错误，请直接纠正。";
        return pendingConfirmation;
    }

    public String demoExecute(ActionExecutor executor) throws Exception {
        JSONObject plan = new JSONObject();
        plan.put("type", "action_plan");
        plan.put("goal", pendingRequest.length() == 0 ? "打开设置并返回桌面" : pendingRequest);
        JSONArray actions = new JSONArray();
        actions.put(new JSONObject().put("action", "open_settings"));
        actions.put(new JSONObject().put("action", "wait").put("ms", 1200));
        actions.put(new JSONObject().put("action", "home"));
        plan.put("actions", actions);
        try {
            return executor.execute(plan);
        } finally {
            reset();
        }
    }

    public void reset() {
        pendingRequest = "";
        pendingConfirmation = "";
        pendingPlan = null;
        pendingPlanRequest = "";
        pendingTaskId = "";
    }

    private boolean isConfirm(String input) {
        String t = input.trim().toLowerCase();
        return t.equals("正确") || t.equals("确认") || t.equals("ok") || t.equals("yes") || t.equals("对");
    }

    private boolean isExecute(String input) {
        String t = input.trim().toLowerCase();
        return t.equals("执行") || t.equals("开始执行") || t.equals("run") || t.equals("go");
    }

    private String readableConfirmation(JSONObject json) {
        StringBuilder out = new StringBuilder();
        out.append("我收到的用户请求原话是：\"").append(json.optString("original_request", pendingRequest)).append("\"\n\n");
        out.append("经过拆解，我理解你希望我：\n");
        JSONArray steps = json.optJSONArray("steps");
        if (steps == null || steps.length() == 0) {
            out.append("1. ").append(json.optString("summary", pendingRequest)).append("\n");
        } else {
            for (int i = 0; i < steps.length(); i++) out.append(i + 1).append(". ").append(steps.optString(i)).append("\n");
        }
        out.append("\n请确认我的理解是否正确。如果正确，请回复“正确”；如果错误，请直接纠正。");
        return out.toString();
    }

    private String summarize(JSONObject json) {
        JSONArray actions = json.optJSONArray("actions");
        if (actions == null) return json.optString("goal", "动作计划");
        StringBuilder out = new StringBuilder(json.optString("goal", "动作计划")).append("\n");
        for (int i = 0; i < actions.length(); i++) out.append(i + 1).append(". ").append(actions.optJSONObject(i).optString("action")).append("\n");
        return out.toString();
    }

    public static JSONObject extractJson(String text) throws Exception {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) throw new Exception("Model did not return JSON: " + text);
        return new JSONObject(text.substring(start, end + 1));
    }

    private String confirmSystem() {
        return "你是 Fold7 Agent 的意图确认 Agent。只做用户意图理解和动作拆解，不生成代码，不执行动作。返回严格 JSON，格式：{\"type\":\"confirmation\",\"original_request\":\"...\",\"summary\":\"...\",\"steps\":[\"...\"]}。步骤要明确到打开哪个应用、查找什么对象、输入什么内容、是否需要定时。不要输出 JSON 以外的文字。";
    }

    private String generateSystem() {
        return "你是 Fold7 Agent 的动作计划 Agent。用户已经确认意图。不要生成 AutoX 脚本，不要生成 JavaScript，只返回严格 JSON。格式：{\"type\":\"action_plan\",\"goal\":\"...\",\"actions\":[...] }。可用动作：open_app(package/appName), open_settings, tap_text(text, timeoutMs可选), tap_xy(x,y), input_text(text, timeoutMs可选), wait(ms), back, home。优先使用文本和应用启动动作；只有没有可识别文本时才使用 tap_xy，坐标会经过 Fold7 的校准参数换算。每个需要查找 UI 的动作应设置合理 timeoutMs，默认 8000ms。动作必须少而清晰，缺少关键上下文时用最稳妥的路径。";
    }
}
