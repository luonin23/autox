package com.fold7.agent.core;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class TaskStore {
    private static final String PREF = "fold7_tasks";
    private final SharedPreferences prefs;

    public TaskStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public String savePlan(String request, JSONObject plan) {
        return savePlan(request, plan, "normal");
    }

    public String savePlan(String request, JSONObject plan, String mode) {
        String id = "task-" + System.currentTimeMillis();
        TaskRecord record = new TaskRecord(id, title(request), request, plan.toString(), "draft", "", System.currentTimeMillis(),
            mode, 0, 0, 1, 0);
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        list.add(0, record);
        saveAll(list);
        return id;
    }

    public void updateExecution(String id, String status, String transcript) {
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        for (int i = 0; i < list.size(); i++) {
            TaskRecord item = list.get(i);
            if (item.id.equals(id)) list.set(i, item.withExecution(status, transcript));
        }
        saveAll(list);
    }

    public void updatePlan(String id, String title, String request, String planJson) {
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        for (int i = 0; i < list.size(); i++) {
            TaskRecord item = list.get(i);
            if (item.id.equals(id)) list.set(i, item.withPlan(empty(title, item.title), request, planJson));
        }
        saveAll(list);
    }

    public void updateSchedule(String id, String mode, long scheduleAt, int intervalMinutes, int maxRuns, int runCount) {
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        for (int i = 0; i < list.size(); i++) {
            TaskRecord item = list.get(i);
            if (item.id.equals(id)) list.set(i, item.withSchedule(mode, scheduleAt, intervalMinutes, maxRuns, runCount));
        }
        saveAll(list);
    }

    public void incrementRunCount(String id) {
        TaskRecord task = find(id);
        if (task != null) updateSchedule(id, task.mode, task.scheduleAt, task.intervalMinutes, task.maxRuns, task.runCount + 1);
    }

    public void delete(String id) {
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        for (int i = list.size() - 1; i >= 0; i--) if (list.get(i).id.equals(id)) list.remove(i);
        saveAll(list);
    }

    public TaskRecord find(String id) {
        for (TaskRecord task : tasks()) if (task.id.equals(id)) return task;
        return null;
    }

    public List<TaskRecord> tasks() {
        ArrayList<TaskRecord> list = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(prefs.getString("tasks", "[]"));
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                list.add(new TaskRecord(
                    item.optString("id"),
                    item.optString("title"),
                    item.optString("request"),
                    item.optString("planJson"),
                    item.optString("status"),
                    item.optString("transcript"),
                    item.optLong("updatedAt"),
                    item.optString("mode", "normal"),
                    item.optLong("scheduleAt", 0),
                    item.optInt("intervalMinutes", 0),
                    item.optInt("maxRuns", 1),
                    item.optInt("runCount", 0)
                ));
            }
        } catch (Exception ignored) {
        }
        return list;
    }

    private void saveAll(List<TaskRecord> list) {
        try {
            JSONArray array = new JSONArray();
            for (TaskRecord item : list) array.put(item.toJson());
            prefs.edit().putString("tasks", array.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private String title(String request) {
        if (request == null || request.trim().isEmpty()) return "未命名任务";
        String clean = request.replace("\n", " ").trim();
        return clean.length() > 24 ? clean.substring(0, 24) : clean;
    }

    private static String empty(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    public static class TaskRecord {
        public final String id;
        public final String title;
        public final String request;
        public final String planJson;
        public final String status;
        public final String transcript;
        public final long updatedAt;
        public final String mode;
        public final long scheduleAt;
        public final int intervalMinutes;
        public final int maxRuns;
        public final int runCount;

        public TaskRecord(String id, String title, String request, String planJson, String status, String transcript, long updatedAt) {
            this(id, title, request, planJson, status, transcript, updatedAt, "normal", 0, 0, 1, 0);
        }

        public TaskRecord(String id, String title, String request, String planJson, String status, String transcript, long updatedAt,
                          String mode, long scheduleAt, int intervalMinutes, int maxRuns, int runCount) {
            this.id = id;
            this.title = empty(title, "未命名任务");
            this.request = empty(request, "");
            this.planJson = empty(planJson, "{}");
            this.status = empty(status, "draft");
            this.transcript = empty(transcript, "");
            this.updatedAt = updatedAt;
            this.mode = empty(mode, "normal");
            this.scheduleAt = scheduleAt;
            this.intervalMinutes = Math.max(0, intervalMinutes);
            this.maxRuns = Math.max(1, maxRuns);
            this.runCount = Math.max(0, runCount);
        }

        TaskRecord withExecution(String status, String transcript) {
            return new TaskRecord(id, title, request, planJson, status, transcript, System.currentTimeMillis(),
                mode, scheduleAt, intervalMinutes, maxRuns, runCount);
        }

        TaskRecord withPlan(String title, String request, String planJson) {
            return new TaskRecord(id, title, request, planJson, "draft", transcript, System.currentTimeMillis(),
                mode, scheduleAt, intervalMinutes, maxRuns, runCount);
        }

        TaskRecord withSchedule(String mode, long scheduleAt, int intervalMinutes, int maxRuns, int runCount) {
            return new TaskRecord(id, title, request, planJson, status, transcript, System.currentTimeMillis(),
                mode, scheduleAt, intervalMinutes, maxRuns, runCount);
        }

        JSONObject toJson() throws Exception {
            return new JSONObject()
                .put("id", id)
                .put("title", title)
                .put("request", request)
                .put("planJson", planJson)
                .put("status", status)
                .put("transcript", transcript)
                .put("updatedAt", updatedAt)
                .put("mode", mode)
                .put("scheduleAt", scheduleAt)
                .put("intervalMinutes", intervalMinutes)
                .put("maxRuns", maxRuns)
                .put("runCount", runCount);
        }
    }
}
