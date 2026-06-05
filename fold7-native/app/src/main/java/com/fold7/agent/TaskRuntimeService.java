package com.fold7.agent;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import com.fold7.agent.core.ActionExecutor;
import com.fold7.agent.core.ConfigStore;
import com.fold7.agent.core.LogStore;
import com.fold7.agent.core.ModelClient;
import com.fold7.agent.core.RuntimeAgent;
import com.fold7.agent.core.RuntimeControl;
import com.fold7.agent.core.TaskScheduler;
import com.fold7.agent.core.TaskStore;
import org.json.JSONObject;

public class TaskRuntimeService extends Service {
    private static final String CHANNEL_ID = "fold7_runtime";
    public static final String EXTRA_TASK_ID = "taskId";
    public static final String EXTRA_SCHEDULED = "scheduled";
    private static volatile String currentTaskId = "";
    private volatile boolean running = false;

    public static void start(Context context, String taskId, boolean scheduled) {
        RuntimeControl.reset();
        Intent intent = new Intent(context, TaskRuntimeService.class);
        intent.putExtra(EXTRA_TASK_ID, taskId);
        intent.putExtra(EXTRA_SCHEDULED, scheduled);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    public static void requestStop() {
        RuntimeControl.requestStop();
        LogStore.add("RUN", "stop requested by user");
    }

    public static boolean isRunning(String taskId) {
        return taskId != null && taskId.equals(currentTaskId) && !RuntimeControl.isStopRequested();
    }

    public static boolean isAnyRunning() {
        return currentTaskId.length() > 0 && !RuntimeControl.isStopRequested();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(7, notification("Fold7 正在执行任务"));
    }

    @Override
    public int onStartCommand(final Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        if (running) {
            LogStore.add("RUN", "runtime service is already running");
            return START_NOT_STICKY;
        }
        running = true;
        final String taskId = intent.getStringExtra(EXTRA_TASK_ID);
        final boolean scheduled = intent.getBooleanExtra(EXTRA_SCHEDULED, false);
        currentTaskId = taskId == null ? "" : taskId;
        new Thread(new Runnable() {
            public void run() {
                try {
                    runTask(taskId, scheduled);
                } catch (Exception e) {
                    LogStore.add("ERR", "runtime service failed: " + e.getMessage());
                    if (taskId != null) new TaskStore(TaskRuntimeService.this).updateExecution(taskId, RuntimeControl.isStopRequested() ? "stopped" : "failed", e.getMessage());
                } finally {
                    running = false;
                    currentTaskId = "";
                    stopForeground(true);
                    stopSelf();
                }
            }
        }).start();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void runTask(String taskId, boolean scheduled) throws Exception {
        if (taskId == null || taskId.length() == 0) throw new Exception("missing task id");
        TaskStore store = new TaskStore(this);
        TaskStore.TaskRecord task = store.find(taskId);
        if (task == null) throw new Exception("task not found: " + taskId);
        ConfigStore config = new ConfigStore(this);
        LogStore.add(scheduled ? "SCH" : "RUN", "runtime service started: " + task.title);
        String result = new RuntimeAgent(this, new ModelClient(config), new ActionExecutor(this), config)
            .execute(task.request, new JSONObject(task.planJson));
        if (scheduled) {
            store.incrementRunCount(task.id);
            TaskStore.TaskRecord afterCount = store.find(task.id);
            store.updateExecution(task.id, "done", result);
            TaskScheduler.scheduleNextIfNeeded(this, afterCount);
        } else {
            store.updateExecution(task.id, "done", result);
        }
        LogStore.task("Runtime service executed: " + task.title);
    }

    private Notification notification(String text) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setContentTitle("Fold7 Agent")
            .setContentText(text)
            .setSmallIcon(com.fold7.agent.R.drawable.ic_launcher)
            .setOngoing(true);
        return builder.build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Fold7 Runtime", NotificationManager.IMPORTANCE_LOW);
        manager.createNotificationChannel(channel);
    }
}
