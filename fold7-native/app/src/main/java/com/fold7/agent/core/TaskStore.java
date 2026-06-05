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
        String id = "task-" + System.currentTimeMillis();
        TaskRecord record = new TaskRecord(id, title(request), request, plan.toString(), "draft", "", System.currentTimeMillis());
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        list.add(0, record);
        saveAll(list);
        return id;
    }

    public void updateExecution(String id, String status, String transcript) {
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        for (int i = 0; i < list.size(); i++) {
            TaskRecord item = list.get(i);
            if (item.id.equals(id)) list.set(i, new TaskRecord(item.id, item.title, item.request, item.planJson, status, transcript, System.currentTimeMillis()));
        }
        saveAll(list);
    }

    public void updatePlan(String id, String title, String request, String planJson) {
        ArrayList<TaskRecord> list = new ArrayList<>(tasks());
        for (int i = 0; i < list.size(); i++) {
            TaskRecord item = list.get(i);
            if (item.id.equals(id)) list.set(i, new TaskRecord(item.id, empty(title, item.title), request, planJson, "draft", item.transcript, System.currentTimeMillis()));
        }
        saveAll(list);
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
                    item.optLong("updatedAt")
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

        public TaskRecord(String id, String title, String request, String planJson, String status, String transcript, long updatedAt) {
            this.id = id;
            this.title = empty(title, "未命名任务");
            this.request = empty(request, "");
            this.planJson = empty(planJson, "{}");
            this.status = empty(status, "draft");
            this.transcript = empty(transcript, "");
            this.updatedAt = updatedAt;
        }

        JSONObject toJson() throws Exception {
            return new JSONObject()
                .put("id", id)
                .put("title", title)
                .put("request", request)
                .put("planJson", planJson)
                .put("status", status)
                .put("transcript", transcript)
                .put("updatedAt", updatedAt);
        }
    }
}
