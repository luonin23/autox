package com.fold7.agent;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.fold7.agent.core.ActionExecutor;
import com.fold7.agent.core.ChatEngine;
import com.fold7.agent.core.ConfigStore;
import com.fold7.agent.core.LogStore;
import com.fold7.agent.core.ModelClient;
import com.fold7.agent.core.RuntimeAgent;
import com.fold7.agent.core.TaskScheduler;
import com.fold7.agent.core.TaskStore;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity implements LogStore.Listener {
    private static final int CANVAS = Color.rgb(244, 242, 236);
    private static final int INK = Color.rgb(36, 35, 31);
    private static final int MUTED = Color.rgb(113, 111, 104);
    private static final int LINE = Color.rgb(224, 220, 210);
    private static final int PANEL = Color.WHITE;
    private static final int ACCENT = Color.rgb(47, 125, 98);
    private static final int SOFT = Color.rgb(223, 238, 231);

    private ConfigStore config;
    private TaskStore tasks;
    private ChatEngine chat;
    private ActionExecutor executor;
    private FrameLayout content;
    private LinearLayout tabBar;
    private TextView title;
    private TextView subtitle;
    private TextView logText;
    private LinearLayout chatMessages;
    private EditText chatInput;
    private final List<String> chatTexts = new ArrayList<>();
    private final List<Boolean> chatUsers = new ArrayList<>();
    private int tab = 0;
    private int settingsPage = 0;
    private String editingTaskId = "";
    private String chatTaskMode = "normal";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        config = new ConfigStore(this);
        tasks = new TaskStore(this);
        executor = new ActionExecutor(this);
        rebuildChat();
        LogStore.setListener(this);
        setContentView(shell());
        showTab(0);
        LogStore.add("SYS", "Fold7 native app started");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 20 && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            importExistingConfig();
        }
    }

    @Override
    public void onLogChanged() {
        runOnUiThread(new Runnable() { public void run() { refreshLogs(); } });
    }

    private View shell() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(CANVAS);
        root.setPadding(dp(16), dp(12), dp(16), dp(10));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        IconView mark = new IconView(this, 5);
        header.addView(mark, new LinearLayout.LayoutParams(dp(42), dp(42)));
        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.setPadding(dp(12), 0, 0, 0);
        title = text("Fold7 Agent", 22, INK, true);
        subtitle = text("Native automation console", 12, MUTED, false);
        copy.addView(title);
        copy.addView(subtitle);
        header.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        Button permission = ghostButton("权限");
        permission.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)); }
        });
        header.addView(permission, new LinearLayout.LayoutParams(dp(72), dp(40)));
        root.addView(header);

        content = new FrameLayout(this);
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1);
        cp.topMargin = dp(14);
        root.addView(content, cp);

        tabBar = new LinearLayout(this);
        tabBar.setOrientation(LinearLayout.HORIZONTAL);
        tabBar.setGravity(Gravity.CENTER);
        tabBar.setBackground(round(PANEL, dp(12)));
        tabBar.setPadding(dp(5), dp(5), dp(5), dp(5));
        root.addView(tabBar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(64)));
        addTab("Home", 0, 0);
        addTab("Chat", 1, 1);
        addTab("Manage", 2, 2);
        addTab("Docs", 3, 3);
        addTab("Settings", 4, 4);
        return root;
    }

    private void addTab(final String label, final int icon, final int index) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setPadding(0, dp(4), 0, dp(3));
        IconView iv = new IconView(this, icon);
        TextView tv = text(label, 10, MUTED, false);
        tv.setGravity(Gravity.CENTER);
        item.addView(iv, new LinearLayout.LayoutParams(dp(25), dp(25)));
        item.addView(tv);
        item.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                if (index == 4) settingsPage = 0;
                showTab(index);
            }
        });
        tabBar.addView(item, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
    }

    private void showTab(int index) {
        tab = index;
        content.removeAllViews();
        for (int i = 0; i < tabBar.getChildCount(); i++) {
            tabBar.getChildAt(i).setBackground(round(i == tab ? SOFT : Color.TRANSPARENT, dp(9)));
        }
        if (index == 0) content.addView(home());
        if (index == 1) content.addView(chatView());
        if (index == 2) content.addView(manage());
        if (index == 3) content.addView(docs());
        if (index == 4) content.addView(settingsView());
    }

    private View home() {
        LinearLayout page = page();
        page.addView(sectionTitle("运行状态"));
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        grid.addView(statusCard("启用模型", config.hasModel() ? config.activeModelName() : "未配置", config.model()));
        grid.addView(statusCard("执行权限", Fold7AccessibilityService.instance() == null ? "待开启" : "已连接", "用于执行确认后的动作计划"));
        grid.addView(statusCard("今日任务", String.valueOf(LogStore.history().size()), "包含 AI 生成与手动测试任务"));
        page.addView(grid);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button chatBtn = primaryButton("开始对话");
        chatBtn.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { showTab(1); } });
        Button testBtn = ghostButton("本机动作测试");
        testBtn.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { runLocalDemo(); } });
        actions.addView(chatBtn, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(0, dp(46), 1);
        gp.leftMargin = dp(10);
        actions.addView(testBtn, gp);
        page.addView(actions);
        addLogPanel(page);
        return scroll(page);
    }

    private View chatView() {
        LinearLayout page = page();
        page.addView(sectionTitle("AI 对话"));
        TextView hint = text("先确认用户意图，再生成动作计划，最后由原生执行器运行。", 13, MUTED, false);
        page.addView(hint);
        page.addView(taskModeSelector());
        chatMessages = new LinearLayout(this);
        chatMessages.setOrientation(LinearLayout.VERTICAL);
        chatMessages.setPadding(0, dp(8), 0, dp(8));
        if (chatTexts.isEmpty()) {
            addMessage(false, "输入一个目标，例如：打开设置然后返回桌面。模型会先回复确认拆解，确认后才会执行。");
        } else {
            for (int i = 0; i < chatTexts.size(); i++) drawMessage(chatUsers.get(i), chatTexts.get(i));
        }
        page.addView(chatMessages, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        LinearLayout inputRow = new LinearLayout(this);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);
        chatInput = new EditText(this);
        chatInput.setTextColor(INK);
        chatInput.setTextSize(14);
        chatInput.setSingleLine(false);
        chatInput.setMinLines(1);
        chatInput.setMaxLines(3);
        chatInput.setHint("描述你想让手机完成的事");
        chatInput.setBackground(round(PANEL, dp(8)));
        chatInput.setPadding(dp(12), 0, dp(12), 0);
        Button send = primaryButton("发送");
        send.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { sendChat(); } });
        Button execute = ghostButton("执行");
        execute.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { executePendingPlan(); } });
        inputRow.addView(chatInput, new LinearLayout.LayoutParams(0, dp(52), 1));
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(dp(72), dp(52));
        sp.leftMargin = dp(8);
        inputRow.addView(send, sp);
        LinearLayout.LayoutParams ep = new LinearLayout.LayoutParams(dp(72), dp(52));
        ep.leftMargin = dp(8);
        inputRow.addView(execute, ep);
        page.addView(inputRow);
        return page;
    }

    private View taskModeSelector() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(8), 0, dp(4));
        row.addView(modeButton("普通", "normal"), new LinearLayout.LayoutParams(0, dp(40), 1));
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, dp(40), 1);
        tp.leftMargin = dp(8);
        row.addView(modeButton("定时", "timed"), tp);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(40), 1);
        lp.leftMargin = dp(8);
        row.addView(modeButton("循环", "loop"), lp);
        return row;
    }

    private Button modeButton(final String label, final String mode) {
        Button button = "normal".equals(mode) ? ghostButton(label) : ghostButton(label);
        button.setText(("".equals(chatTaskMode) ? "normal" : chatTaskMode).equals(mode) ? label + " 已选" : label);
        button.setBackground(round(chatTaskMode.equals(mode) ? SOFT : PANEL, dp(8)));
        button.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                chatTaskMode = mode;
                chat.setTaskMode(mode);
                showTab(1);
            }
        });
        return button;
    }

    private View manage() {
        if (editingTaskId.length() > 0) return taskEditor();
        LinearLayout page = page();
        page.addView(sectionTitle("任务计划"));
        page.addView(text("Chat 生成的动作计划会保存在这里。你可以查看、编辑、执行或删除；执行时仍由运行时 AI 根据当前页面逐步判断。", 13, MUTED, false));
        List<TaskStore.TaskRecord> list = tasks.tasks();
        if (list.isEmpty()) page.addView(empty("暂无任务计划"));
        for (TaskStore.TaskRecord item : list) page.addView(taskCard(item));
        addLogPanel(page);
        return scroll(page);
    }

    private View taskCard(final TaskStore.TaskRecord task) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(14), dp(12), dp(14), dp(12));
        box.setBackground(round(PANEL, dp(8)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        box.setLayoutParams(lp);
        box.addView(text(task.title + "\n" + task.status + "\n" + task.request, 13, INK, false));
        box.addView(text(task.mode + scheduleSummary(task), 12, MUTED, false));
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        Button view = ghostButton("查看");
        view.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                editingTaskId = task.id;
                showTab(2);
            }
        });
        Button run = primaryButton("执行");
        run.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { executeTask(task.id); }
        });
        Button delete = ghostButton("删除");
        delete.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                TaskScheduler.cancel(MainActivity.this, task.id);
                tasks.delete(task.id);
                Toast.makeText(MainActivity.this, "已删除任务", Toast.LENGTH_SHORT).show();
                showTab(2);
            }
        });
        row.addView(view, new LinearLayout.LayoutParams(0, dp(42), 1));
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, dp(42), 1);
        bp.leftMargin = dp(8);
        row.addView(run, bp);
        LinearLayout.LayoutParams dpv = new LinearLayout.LayoutParams(0, dp(42), 1);
        dpv.leftMargin = dp(8);
        row.addView(delete, dpv);
        box.addView(row);
        return box;
    }

    private View taskEditor() {
        final TaskStore.TaskRecord task = tasks.find(editingTaskId);
        if (task == null) {
            editingTaskId = "";
            return manage();
        }
        LinearLayout page = page();
        page.addView(manageBackHeader("任务计划"));
        final EditText title = input(task.title, "任务名称");
        final EditText request = multilineInput(task.request, "用户原始需求", 90);
        final EditText plan = multilineInput(task.planJson, "动作计划 JSON", 260);
        final EditText mode = input(task.mode, "normal/timed/loop");
        final EditText startAt = input(task.scheduleAt > 0 ? formatTime(task.scheduleAt) : "", "yyyy-MM-dd HH:mm");
        final EditText interval = input(task.intervalMinutes > 0 ? String.valueOf(task.intervalMinutes) : "", "循环间隔分钟");
        final EditText maxRuns = input(String.valueOf(task.maxRuns), "执行次数");
        page.addView(labeled("Title", title));
        page.addView(labeled("Request", request));
        page.addView(labeled("Plan JSON", plan));
        page.addView(labeled("Task Mode", mode));
        page.addView(labeled("Start Time", startAt));
        page.addView(labeled("Loop Interval Minutes", interval));
        page.addView(labeled("Max Runs", maxRuns));
        if (task.transcript.length() > 0) page.addView(cardText("执行记录\n" + task.transcript));
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        Button save = primaryButton("保存");
        save.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                tasks.updatePlan(task.id, title.getText().toString(), request.getText().toString(), plan.getText().toString());
                saveScheduleFields(task.id, mode, startAt, interval, maxRuns);
                Toast.makeText(MainActivity.this, "已保存任务", Toast.LENGTH_SHORT).show();
                editingTaskId = "";
                showTab(2);
            }
        });
        Button run = ghostButton("执行");
        run.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                tasks.updatePlan(task.id, title.getText().toString(), request.getText().toString(), plan.getText().toString());
                saveScheduleFields(task.id, mode, startAt, interval, maxRuns);
                editingTaskId = "";
                executeTask(task.id);
            }
        });
        row.addView(save, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(0, dp(46), 1);
        rp.leftMargin = dp(10);
        row.addView(run, rp);
        page.addView(row);
        return scroll(page);
    }

    private void saveScheduleFields(String taskId, EditText mode, EditText startAt, EditText interval, EditText maxRuns) {
        String value = mode.getText().toString().trim();
        if (!"timed".equals(value) && !"loop".equals(value)) value = "normal";
        long scheduleAt = parseTime(startAt.getText().toString().trim());
        int intervalMinutes = Math.round(num(interval, 0));
        int runs = Math.max(1, Math.round(num(maxRuns, 1)));
        tasks.updateSchedule(taskId, value, scheduleAt, intervalMinutes, runs, 0);
        TaskStore.TaskRecord updated = tasks.find(taskId);
        TaskScheduler.cancel(this, taskId);
        if (updated != null && !"normal".equals(updated.mode)) TaskScheduler.schedule(this, updated);
    }

    private View manageBackHeader(String label) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        Button back = ghostButton("返回");
        back.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                editingTaskId = "";
                showTab(2);
            }
        });
        TextView title = text(label, 18, INK, true);
        title.setPadding(dp(12), 0, 0, 0);
        row.addView(back, new LinearLayout.LayoutParams(dp(78), dp(42)));
        row.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        return row;
    }

    private void executeTask(final String taskId) {
        final TaskStore.TaskRecord task = tasks.find(taskId);
        if (task == null) return;
        Toast.makeText(this, "开始执行任务：" + task.title, Toast.LENGTH_SHORT).show();
        new Thread(new Runnable() {
            public void run() {
                try {
                    String result = new RuntimeAgent(new ModelClient(config), executor).execute(task.request, new JSONObject(task.planJson));
                    tasks.updateExecution(task.id, "done", result);
                    LogStore.task("Managed task executed: " + task.title);
                    runOnUiThread(new Runnable() {
                        public void run() {
                            Toast.makeText(MainActivity.this, "任务执行完成", Toast.LENGTH_LONG).show();
                            showTab(2);
                        }
                    });
                } catch (final Exception e) {
                    tasks.updateExecution(task.id, "failed", e.getMessage());
                    LogStore.add("ERR", e.getMessage());
                    runOnUiThread(new Runnable() {
                        public void run() {
                            Toast.makeText(MainActivity.this, "任务失败：" + e.getMessage(), Toast.LENGTH_LONG).show();
                            showTab(2);
                        }
                    });
                }
            }
        }).start();
    }

    private View docs() {
        LinearLayout page = page();
        page.addView(sectionTitle("框架说明"));
        page.addView(cardText("架构：这是独立原生 APK，不依赖 AutoX runtime。手机重启后只要 APK 未卸载，就能直接启动；执行跨应用动作需要重新保持无障碍权限开启。"));
        page.addView(cardText("模型：Settings 中配置 Kimi、DeepSeek 或兼容 OpenAI 的本地服务。Chat 中先做意图确认，用户确认后才生成动作 JSON。"));
        page.addView(cardText("插件：旧文档里的插件指 AutoX 脚本扩展能力。新架构里它会演进成动作模块，例如微信、飞书、系统设置等应用的专用执行器。它的作用是把通用模型输出约束为可靠、可测试、可复用的手机操作能力。"));
        page.addView(cardText("流程：理解应用和手机环境 -> 确认用户意图 -> 生成动作计划 -> 执行并监控日志 -> 出错后回到对话上下文修正。"));
        return scroll(page);
    }

    private View settingsView() {
        if (settingsPage == 1) return modelListPage();
        if (settingsPage == 2) return scroll(calibrationOnlyPage());
        if (settingsPage == 3) return modelFormPage();
        return settingsMenu();
    }

    private View settingsMenu() {
        LinearLayout page = page();
        page.addView(sectionTitle("设置"));
        page.addView(settingsOption("模型配置", "管理 Kimi、DeepSeek 和自定义模型，点击列表项即可启用。", new View.OnClickListener() {
            public void onClick(View v) {
                settingsPage = 1;
                showTab(4);
            }
        }));
        page.addView(settingsOption("坐标校准", "配置坐标偏移和缩放，用于没有稳定文字节点的页面点击。", new View.OnClickListener() {
            public void onClick(View v) {
                settingsPage = 2;
                showTab(4);
            }
        }));
        addLogPanel(page);
        return scroll(page);
    }

    private View modelListPage() {
        LinearLayout page = page();
        page.addView(backHeader("模型配置"));
        page.addView(sectionTitle("模型列表"));
        for (ConfigStore.ModelProfile profile : config.modelProfiles()) {
            page.addView(modelProfileCard(profile));
        }
        page.addView(settingsOption("增加自定义模型", "新增 DeepSeek、本地模型或其它兼容 OpenAI/Anthropic 的服务。", new View.OnClickListener() {
            public void onClick(View v) {
                settingsPage = 3;
                showTab(4);
            }
        }));
        addLogPanel(page);
        return scroll(page);
    }

    private View modelFormPage() {
        LinearLayout page = page();
        page.addView(backHeader("新增自定义模型"));

        final EditText name = input("", "例如 DeepSeek");
        final EditText provider = input("", "provider: kimi/deepseek/local");
        final EditText format = input("", "format: openai/anthropic");
        final EditText baseUrl = input("", "base URL");
        final EditText apiKey = input("", "API Key");
        apiKey.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        final EditText model = input("", "model");
        final EditText timeout = input("", "action timeout ms");
        page.addView(labeled("Name", name));
        page.addView(labeled("Provider", provider));
        page.addView(labeled("Format", format));
        page.addView(labeled("Base URL", baseUrl));
        page.addView(labeled("API Key", apiKey));
        page.addView(labeled("Model", model));
        page.addView(labeled("Action Timeout", timeout));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        Button save = primaryButton("保存为模型");
        save.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                config.saveCustomModel(name.getText().toString(), provider.getText().toString(), format.getText().toString(),
                    baseUrl.getText().toString(), apiKey.getText().toString(), model.getText().toString());
                config.saveActionTimeoutMs(Math.round(num(timeout, config.actionTimeoutMs())));
                rebuildChat();
                LogStore.add("CFG", "Model saved and activated: " + config.activeModelName());
                Toast.makeText(MainActivity.this, "已启用模型：" + config.activeModelName(), Toast.LENGTH_SHORT).show();
                settingsPage = 1;
                showTab(4);
            }
        });
        Button test = ghostButton("测试连接");
        test.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { testModel(); } });
        buttons.addView(save, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, dp(46), 1);
        tp.leftMargin = dp(10);
        buttons.addView(test, tp);
        page.addView(buttons);

        Button importConfig = ghostButton("导入旧配置");
        importConfig.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                ensureConfigImportPermission();
            }
        });
        page.addView(importConfig, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(46)));
        addLogPanel(page);
        return scroll(page);
    }

    private View calibrationOnlyPage() {
        LinearLayout page = page();
        page.addView(backHeader("坐标校准"));
        page.addView(calibrationPanel());
        addLogPanel(page);
        return page;
    }

    private View backHeader(String label) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        Button back = ghostButton("返回");
        back.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                settingsPage = settingsPage == 3 ? 1 : 0;
                showTab(4);
            }
        });
        TextView title = text(label, 18, INK, true);
        title.setPadding(dp(12), 0, 0, 0);
        row.addView(back, new LinearLayout.LayoutParams(dp(78), dp(42)));
        row.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        return row;
    }

    private View settingsOption(String title, String detail, View.OnClickListener listener) {
        TextView view = text(title + "\n" + detail, 14, INK, false);
        view.setLineSpacing(dp(3), 1f);
        view.setPadding(dp(14), dp(14), dp(14), dp(14));
        view.setBackground(round(PANEL, dp(8)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        view.setLayoutParams(lp);
        view.setOnClickListener(listener);
        return view;
    }

    private View modelProfileCard(final ConfigStore.ModelProfile profile) {
        TextView view = text((profile.id.equals(config.activeModelId()) ? "已启用  " : "可启用  ") + profile.name
            + "\n" + profile.provider + " / " + profile.format
            + "\n" + profile.model, 13, INK, false);
        view.setLineSpacing(dp(2), 1f);
        view.setPadding(dp(14), dp(12), dp(14), dp(12));
        view.setBackground(round(profile.id.equals(config.activeModelId()) ? SOFT : PANEL, dp(8)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(8);
        view.setLayoutParams(lp);
        view.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                if (config.activateModel(profile.id)) {
                    rebuildChat();
                    LogStore.add("CFG", "Activated model: " + config.activeModelName());
                    Toast.makeText(MainActivity.this, "已启用模型：" + config.activeModelName(), Toast.LENGTH_SHORT).show();
                    settingsPage = 1;
                    showTab(4);
                }
            }
        });
        return view;
    }

    private void sendChat() {
        final String input = chatInput.getText().toString().trim();
        if (input.length() == 0) return;
        addMessage(true, input);
        chatInput.setText("");
        hideKeyboard();
        addMessage(false, "处理中...");
        new Thread(new Runnable() {
            public void run() {
                try {
                    final String reply = config.hasModel() ? chat.handle(input, executor) : localFallback(input);
                    runOnUiThread(new Runnable() { public void run() { replaceLastMessage(reply); } });
                } catch (final Exception e) {
                    chat.reset();
                    LogStore.add("ERR", e.getMessage());
                    runOnUiThread(new Runnable() {
                        public void run() {
                            replaceLastMessage("执行失败：" + e.getMessage() + "\n\n你可以继续输入新的指令，我会重新开始处理。");
                            Toast.makeText(MainActivity.this, "执行失败：" + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                }
            }
        }).start();
    }

    private void executePendingPlan() {
        addMessage(true, "执行");
        addMessage(false, "开始执行...");
        new Thread(new Runnable() {
            public void run() {
                try {
                    if (!config.hasModel()) throw new Exception("请先配置并启用模型");
                    final String reply = chat.executePending(executor);
                    runOnUiThread(new Runnable() { public void run() { replaceLastMessage(reply); } });
                } catch (final Exception e) {
                    chat.reset();
                    LogStore.add("ERR", e.getMessage());
                    runOnUiThread(new Runnable() {
                        public void run() {
                            replaceLastMessage("执行失败：" + e.getMessage() + "\n\n你可以继续输入新的指令，我会重新开始处理。");
                            Toast.makeText(MainActivity.this, "执行失败：" + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                }
            }
        }).start();
    }

    private String localFallback(String input) throws Exception {
        if (!chat.waitingConfirmation()) return chat.demoConfirm(input);
        chat.reset();
        return "未检测到模型配置，无法生成真实动作计划。请先在 Settings 中启用模型。";
    }

    private void testModel() {
        LogStore.add("NET", "Testing model connection");
        new Thread(new Runnable() {
            public void run() {
                try {
                    String result = new ModelClient(config).test();
                    LogStore.add("NET", "Model ok: " + trim(result));
                } catch (Exception e) {
                    LogStore.add("ERR", "Model test failed: " + e.getMessage());
                }
            }
        }).start();
    }

    private void ensureConfigImportPermission() {
        if (config.hasModel()) return;
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, 20);
            return;
        }
        importExistingConfig();
    }

    private void importExistingConfig() {
        boolean ok = config.importAutoXConfig();
        LogStore.add(ok ? "CFG" : "CFG", ok ? "Imported AutoX config" : "No existing AutoX config found");
        if (ok) {
            rebuildChat();
            showTab(tab);
        }
    }

    private void rebuildChat() {
        chat = new ChatEngine(new ModelClient(config), tasks);
        chat.setTaskMode(chatTaskMode);
    }

    private String scheduleSummary(TaskStore.TaskRecord task) {
        if ("normal".equals(task.mode)) return "";
        return "  " + (task.scheduleAt > 0 ? formatTime(task.scheduleAt) : "未设置时间")
            + "  " + task.runCount + "/" + task.maxRuns
            + ("loop".equals(task.mode) ? "  间隔" + task.intervalMinutes + "分钟" : "");
    }

    private String formatTime(long millis) {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(new Date(millis));
    }

    private long parseTime(String text) {
        try {
            return new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).parse(text).getTime();
        } catch (Exception ignored) {
            return 0;
        }
    }

    private void runLocalDemo() {
        new Thread(new Runnable() {
            public void run() {
                try {
                    chat.demoConfirm("打开设置然后返回桌面");
                    String result = chat.demoExecute(executor);
                    LogStore.add("TEST", result.replace("\n", " "));
                } catch (Exception e) {
                    LogStore.add("ERR", e.getMessage());
                    runOnUiThread(new Runnable() {
                        public void run() {
                            Toast.makeText(MainActivity.this, "本机动作测试失败，请查看日志", Toast.LENGTH_LONG).show();
                        }
                    });
                }
            }
        }).start();
    }

    private View calibrationPanel() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams boxLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        boxLp.topMargin = dp(16);
        box.setLayoutParams(boxLp);
        box.addView(sectionTitle("坐标校准"));
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        box.addView(cardText("屏幕：" + dm.widthPixels + " x " + dm.heightPixels + "\n当前：x = x * " + config.scaleX() + " + " + config.offsetX() + "，y = y * " + config.scaleY() + " + " + config.offsetY()));

        final EditText offsetX = input(String.valueOf(config.offsetX()), "X offset");
        final EditText offsetY = input(String.valueOf(config.offsetY()), "Y offset");
        final EditText scaleX = input(String.valueOf(config.scaleX()), "X scale");
        final EditText scaleY = input(String.valueOf(config.scaleY()), "Y scale");
        box.addView(labeled("X Offset", offsetX));
        box.addView(labeled("Y Offset", offsetY));
        box.addView(labeled("X Scale", scaleX));
        box.addView(labeled("Y Scale", scaleY));

        CalibrationPad pad = new CalibrationPad(this);
        pad.setListener(new CalibrationPad.Listener() {
            public void onTap(float targetX, float targetY, float actualX, float actualY) {
                offsetX.setText(String.valueOf(Math.round(actualX - targetX)));
                offsetY.setText(String.valueOf(Math.round(actualY - targetY)));
                LogStore.add("CAL", "target " + Math.round(targetX) + "," + Math.round(targetY) + " actual " + Math.round(actualX) + "," + Math.round(actualY));
            }
        });
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(220));
        pp.topMargin = dp(8);
        box.addView(pad, pp);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        Button save = primaryButton("保存校准");
        save.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                config.saveCalibration(num(offsetX, 0), num(offsetY, 0), num(scaleX, 1), num(scaleY, 1));
                LogStore.add("CAL", "Calibration saved");
                showTab(4);
            }
        });
        Button reset = ghostButton("重置");
        reset.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                config.saveCalibration(0, 0, 1, 1);
                LogStore.add("CAL", "Calibration reset");
                showTab(4);
            }
        });
        buttons.addView(save, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(0, dp(46), 1);
        rp.leftMargin = dp(10);
        buttons.addView(reset, rp);
        box.addView(buttons);
        return box;
    }

    private float num(EditText edit, float fallback) {
        try {
            return Float.parseFloat(edit.getText().toString().trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private void addMessage(boolean user, String body) {
        chatUsers.add(user);
        chatTexts.add(body);
        drawMessage(user, body);
    }

    private void drawMessage(boolean user, String body) {
        if (chatMessages == null) return;
        TextView bubble = text(body, 14, user ? Color.WHITE : INK, false);
        bubble.setPadding(dp(12), dp(10), dp(12), dp(10));
        bubble.setBackground(round(user ? ACCENT : PANEL, dp(10)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = user ? Gravity.RIGHT : Gravity.LEFT;
        lp.topMargin = dp(8);
        lp.leftMargin = user ? dp(40) : 0;
        lp.rightMargin = user ? 0 : dp(40);
        chatMessages.addView(bubble, lp);
    }

    private void replaceLastMessage(String body) {
        int count = chatMessages.getChildCount();
        if (count == 0) return;
        if (!chatTexts.isEmpty()) chatTexts.set(chatTexts.size() - 1, body);
        TextView view = (TextView) chatMessages.getChildAt(count - 1);
        view.setText(body);
    }

    private void addLogPanel(LinearLayout page) {
        page.addView(sectionTitle("运行日志"));
        logText = text("", 12, MUTED, false);
        logText.setPadding(dp(12), dp(10), dp(12), dp(10));
        logText.setBackground(round(PANEL, dp(8)));
        page.addView(logText, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        refreshLogs();
    }

    private void refreshLogs() {
        if (logText == null) return;
        List<String> logs = LogStore.logs();
        if (logs.isEmpty()) {
            logText.setText("暂无日志");
            return;
        }
        StringBuilder out = new StringBuilder();
        int max = Math.min(8, logs.size());
        for (int i = 0; i < max; i++) out.append(logs.get(i)).append("\n");
        logText.setText(out.toString().trim());
    }

    private LinearLayout page() {
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(0, 0, 0, dp(8));
        return page;
    }

    private ScrollView scroll(View child) {
        ScrollView s = new ScrollView(this);
        s.addView(child);
        return s;
    }

    private TextView statusCard(String label, String value, String detail) {
        TextView v = cardText(label + "\n" + value + "\n" + detail);
        v.setTextSize(14);
        return v;
    }

    private TextView cardText(String body) {
        TextView view = text(body, 13, INK, false);
        view.setLineSpacing(dp(2), 1f);
        view.setPadding(dp(14), dp(12), dp(14), dp(12));
        view.setBackground(round(PANEL, dp(8)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(9);
        view.setLayoutParams(lp);
        return view;
    }

    private TextView empty(String body) {
        TextView view = text(body, 13, MUTED, false);
        view.setGravity(Gravity.CENTER);
        view.setPadding(0, dp(40), 0, dp(40));
        return view;
    }

    private View labeled(String label, EditText input) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        TextView l = text(label, 12, MUTED, false);
        box.addView(l);
        int height = input.getMaxLines() > 1 ? ViewGroup.LayoutParams.WRAP_CONTENT : dp(48);
        box.addView(input, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(10);
        box.setLayoutParams(lp);
        return box;
    }

    private EditText input(String value, String hint) {
        EditText edit = new EditText(this);
        edit.setText(value);
        edit.setHint(hint);
        edit.setSingleLine(true);
        edit.setTextColor(INK);
        edit.setTextSize(14);
        edit.setPadding(dp(12), 0, dp(12), 0);
        edit.setBackground(round(PANEL, dp(8)));
        return edit;
    }

    private EditText multilineInput(String value, String hint, int minHeightDp) {
        EditText edit = input(value, hint);
        edit.setSingleLine(false);
        edit.setMinLines(3);
        edit.setMaxLines(12);
        edit.setGravity(Gravity.TOP);
        edit.setMinHeight(dp(minHeightDp));
        edit.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        return edit;
    }

    private TextView sectionTitle(String body) {
        TextView v = text(body, 17, INK, true);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        lp.bottomMargin = dp(8);
        v.setLayoutParams(lp);
        return v;
    }

    private Button primaryButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextColor(Color.WHITE);
        b.setTextSize(13);
        b.setAllCaps(false);
        b.setBackground(round(ACCENT, dp(8)));
        return b;
    }

    private Button ghostButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextColor(INK);
        b.setTextSize(13);
        b.setAllCaps(false);
        b.setBackground(round(PANEL, dp(8)));
        return b;
    }

    private TextView text(String body, int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(body);
        v.setTextSize(sp);
        v.setTextColor(color);
        if (bold) v.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return v;
    }

    private android.graphics.drawable.Drawable round(int color, int radius) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        if (color == PANEL) d.setStroke(1, LINE);
        return d;
    }

    private void hideKeyboard() {
        try {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(chatInput.getWindowToken(), 0);
        } catch (Exception ignored) {
        }
    }

    private String trim(String text) {
        return text == null ? "" : text.replace("\n", " ").trim();
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density + 0.5f);
    }

    public static class IconView extends View {
        private final int type;
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);

        public IconView(Context context, int type) {
            super(context);
            this.type = type;
        }

        @Override
        protected void onDraw(Canvas c) {
            super.onDraw(c);
            int w = getWidth();
            int h = getHeight();
            float s = Math.min(w, h);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(3, s / 10));
            p.setStrokeCap(Paint.Cap.ROUND);
            p.setColor(INK);
            float cx = w / 2f;
            float cy = h / 2f;
            if (type == 0) {
                c.drawLine(cx - s * .28f, cy, cx, cy - s * .25f, p);
                c.drawLine(cx, cy - s * .25f, cx + s * .28f, cy, p);
                c.drawRect(cx - s * .22f, cy, cx + s * .22f, cy + s * .28f, p);
            } else if (type == 1) {
                c.drawRoundRect(new RectF(cx - s * .32f, cy - s * .22f, cx + s * .32f, cy + s * .18f), s * .1f, s * .1f, p);
                c.drawLine(cx - s * .1f, cy + s * .18f, cx - s * .24f, cy + s * .31f, p);
            } else if (type == 2) {
                c.drawRect(cx - s * .3f, cy - s * .22f, cx + s * .3f, cy + s * .28f, p);
                c.drawLine(cx - s * .22f, cy - s * .22f, cx - s * .08f, cy - s * .34f, p);
                c.drawLine(cx - s * .08f, cy - s * .34f, cx + s * .16f, cy - s * .34f, p);
            } else if (type == 3) {
                c.drawLine(cx - s * .25f, cy - s * .28f, cx - s * .25f, cy + s * .28f, p);
                c.drawLine(cx + s * .25f, cy - s * .28f, cx + s * .25f, cy + s * .28f, p);
                c.drawLine(cx - s * .25f, cy - s * .25f, cx + s * .25f, cy - s * .25f, p);
                c.drawLine(cx - s * .25f, cy + s * .25f, cx + s * .25f, cy + s * .25f, p);
            } else if (type == 4) {
                c.drawCircle(cx, cy, s * .12f, p);
                for (int i = 0; i < 8; i++) {
                    double a = Math.PI * i / 4;
                    c.drawLine(cx + (float)Math.cos(a) * s * .24f, cy + (float)Math.sin(a) * s * .24f,
                        cx + (float)Math.cos(a) * s * .34f, cy + (float)Math.sin(a) * s * .34f, p);
                }
            } else {
                p.setStyle(Paint.Style.FILL);
                p.setColor(INK);
                c.drawRoundRect(new RectF(0, 0, w, h), s * .16f, s * .16f, p);
                p.setColor(CANVAS);
                p.setTextSize(s * .52f);
                p.setFakeBoldText(true);
                p.setTextAlign(Paint.Align.CENTER);
                c.drawText("F7", cx, cy + s * .18f, p);
                p.setFakeBoldText(false);
            }
        }
    }

    public static class CalibrationPad extends View {
        public interface Listener { void onTap(float targetX, float targetY, float actualX, float actualY); }
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private Listener listener;
        private int target = 0;

        public CalibrationPad(Context context) {
            super(context);
            setBackgroundColor(PANEL);
        }

        public void setListener(Listener listener) {
            this.listener = listener;
        }

        @Override
        protected void onDraw(Canvas c) {
            super.onDraw(c);
            float[][] points = points();
            p.setStyle(Paint.Style.FILL);
            p.setColor(PANEL);
            c.drawRoundRect(new RectF(0, 0, getWidth(), getHeight()), 18, 18, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(2);
            p.setColor(LINE);
            c.drawRoundRect(new RectF(1, 1, getWidth() - 1, getHeight() - 1), 18, 18, p);
            p.setColor(ACCENT);
            p.setStrokeWidth(5);
            float x = points[target][0];
            float y = points[target][1];
            c.drawLine(x - 24, y, x + 24, y, p);
            c.drawLine(x, y - 24, x, y + 24, p);
            p.setStyle(Paint.Style.FILL);
            p.setTextSize(32);
            p.setColor(MUTED);
            p.setTextAlign(Paint.Align.CENTER);
            c.drawText("点击绿色十字，记录实际落点偏移", getWidth() / 2f, getHeight() - 24, p);
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            if (event.getAction() != MotionEvent.ACTION_UP) return true;
            float[][] points = points();
            if (listener != null) listener.onTap(points[target][0], points[target][1], event.getX(), event.getY());
            target = (target + 1) % points.length;
            invalidate();
            return true;
        }

        private float[][] points() {
            float w = Math.max(1, getWidth());
            float h = Math.max(1, getHeight());
            return new float[][] {
                {w * .5f, h * .5f},
                {w * .18f, h * .22f},
                {w * .82f, h * .22f},
                {w * .18f, h * .72f},
                {w * .82f, h * .72f}
            };
        }
    }
}
