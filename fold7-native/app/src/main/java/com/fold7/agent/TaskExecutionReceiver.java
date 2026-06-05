package com.fold7.agent;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.fold7.agent.core.ActionExecutor;
import com.fold7.agent.core.ConfigStore;
import com.fold7.agent.core.LogStore;
import com.fold7.agent.core.ModelClient;
import com.fold7.agent.core.RuntimeAgent;
import com.fold7.agent.core.TaskScheduler;
import com.fold7.agent.core.TaskStore;
import org.json.JSONObject;

public class TaskExecutionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(final Context context, Intent intent) {
        final PendingResult pending = goAsync();
        final String taskId = intent.getStringExtra("taskId");
        new Thread(new Runnable() {
            public void run() {
                try {
                    TaskStore store = new TaskStore(context);
                    TaskStore.TaskRecord task = store.find(taskId);
                    if (task == null) throw new Exception("scheduled task not found");
                    LogStore.add("SCH", "running " + task.title);
                    String result = new RuntimeAgent(new ModelClient(new ConfigStore(context)), new ActionExecutor(context))
                        .execute(task.request, new JSONObject(task.planJson));
                    store.incrementRunCount(task.id);
                    TaskStore.TaskRecord afterCount = store.find(task.id);
                    store.updateExecution(task.id, "done", result);
                    TaskScheduler.scheduleNextIfNeeded(context, afterCount);
                } catch (Exception e) {
                    LogStore.add("ERR", "scheduled task failed: " + e.getMessage());
                    if (taskId != null) new TaskStore(context).updateExecution(taskId, "failed", e.getMessage());
                } finally {
                    pending.finish();
                }
            }
        }).start();
    }
}

