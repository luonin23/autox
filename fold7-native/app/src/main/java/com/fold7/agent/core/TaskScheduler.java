package com.fold7.agent.core;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import com.fold7.agent.TaskExecutionReceiver;

public class TaskScheduler {
    public static void schedule(Context context, TaskStore.TaskRecord task) {
        if (task == null || "normal".equals(task.mode) || task.scheduleAt <= 0) return;
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        long when = Math.max(System.currentTimeMillis() + 1000, task.scheduleAt);
        alarm.setExact(AlarmManager.RTC_WAKEUP, when, intent(context, task.id));
        LogStore.add("SCH", "scheduled " + task.title + " at " + when);
    }

    public static void cancel(Context context, String taskId) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.cancel(intent(context, taskId));
    }

    public static void scheduleNextIfNeeded(Context context, TaskStore.TaskRecord task) {
        if (task == null || !"loop".equals(task.mode)) return;
        if (task.runCount >= task.maxRuns) return;
        if (task.intervalMinutes <= 0) return;
        TaskStore store = new TaskStore(context);
        long next = System.currentTimeMillis() + task.intervalMinutes * 60L * 1000L;
        store.updateSchedule(task.id, task.mode, next, task.intervalMinutes, task.maxRuns, task.runCount);
        TaskStore.TaskRecord updated = store.find(task.id);
        schedule(context, updated);
    }

    private static PendingIntent intent(Context context, String taskId) {
        Intent intent = new Intent(context, TaskExecutionReceiver.class);
        intent.setAction("com.fold7.agent.EXECUTE_TASK");
        intent.putExtra("taskId", taskId);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, taskId.hashCode(), intent, flags);
    }
}

