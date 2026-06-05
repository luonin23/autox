package com.fold7.agent;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.fold7.agent.core.LogStore;
import com.fold7.agent.core.TaskStore;

public class TaskExecutionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String taskId = intent.getStringExtra("taskId");
        try {
            TaskStore store = new TaskStore(context);
            TaskStore.TaskRecord task = store.find(taskId);
            if (task == null) throw new Exception("scheduled task not found");
            LogStore.add("SCH", "starting foreground runtime: " + task.title);
            store.updateExecution(task.id, "running", "定时任务已唤起前台服务执行。");
            TaskRuntimeService.start(context, task.id, true);
        } catch (Exception e) {
            LogStore.add("ERR", "scheduled task failed: " + e.getMessage());
            if (taskId != null) new TaskStore(context).updateExecution(taskId, "failed", e.getMessage());
        }
    }
}
