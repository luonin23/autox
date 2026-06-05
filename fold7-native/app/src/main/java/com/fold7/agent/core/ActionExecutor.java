package com.fold7.agent.core;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.util.DisplayMetrics;
import com.fold7.agent.Fold7AccessibilityService;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.List;

public class ActionExecutor {
    private final Context context;
    private final ConfigStore config;

    public ActionExecutor(Context context) {
        this.context = context.getApplicationContext();
        this.config = new ConfigStore(context);
    }

    public String execute(JSONObject plan) throws Exception {
        JSONArray actions = plan.optJSONArray("actions");
        if (actions == null) throw new Exception("No actions in plan");
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < actions.length(); i++) {
            JSONObject action = actions.getJSONObject(i);
            out.append(i + 1).append(". ").append(executeOne(action)).append("\n");
        }
        return out.toString();
    }

    public String executeOne(JSONObject action) throws Exception {
        String name = actionName(action);
        LogStore.add("RUN", name + " " + describe(action));
        boolean ok = run(action, name);
        if (!ok) throw new Exception("动作失败：" + describe(action) + " json=" + action.toString());
        return name + " ok";
    }

    private boolean run(JSONObject action, String name) throws Exception {
        if ("open_settings".equals(name)) {
            Intent intent = new Intent(Settings.ACTION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        }
        if ("home".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            if (svc != null && svc.home()) return true;
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_HOME);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        }
        if ("back".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            if (svc == null) throw new Exception("无障碍服务未开启，无法返回");
            return svc.back();
        }
        if ("wait".equals(name)) {
            Thread.sleep(Math.max(100, Math.min(10000, action.optInt("ms", 800))));
            return true;
        }
        if ("input_text".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            if (svc == null) throw new Exception("无障碍服务未开启，无法输入文字");
            return waitFor(new Check() { public boolean ok() { return Fold7AccessibilityService.instance().input(action.optString("text")); } }, timeout(action));
        }
        if ("tap_text".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            if (svc == null) throw new Exception("无障碍服务未开启，无法查找文字");
            final String text = action.optString("text");
            boolean ok = waitFor(new Check() { public boolean ok() { return Fold7AccessibilityService.instance().tapText(text); } }, timeout(action));
            if (!ok) throw new Exception("超时未找到文字：" + text);
            return true;
        }
        if ("tap_xy".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            if (svc == null) throw new Exception("无障碍服务未开启，无法点击坐标");
            DisplayMetrics metrics = context.getResources().getDisplayMetrics();
            int imageWidth = svc.screenshotWidth() > 0 ? svc.screenshotWidth() : metrics.widthPixels;
            int imageHeight = svc.screenshotHeight() > 0 ? svc.screenshotHeight() : metrics.heightPixels;
            double inputX = action.optDouble("x", 0);
            double inputY = action.optDouble("y", 0);
            double screenX;
            double screenY;
            if (inputX > 0 && inputX <= 1 && inputY > 0 && inputY <= 1) {
                screenX = inputX * metrics.widthPixels;
                screenY = inputY * metrics.heightPixels;
            } else {
                screenX = imageWidth > 0 ? inputX * metrics.widthPixels / imageWidth : inputX;
                screenY = imageHeight > 0 ? inputY * metrics.heightPixels / imageHeight : inputY;
            }
            float x = (float) (screenX * config.scaleX() + config.offsetX());
            float y = (float) (screenY * config.scaleY() + config.offsetY());
            LogStore.add("RUN", "tap_xy raw(" + round(inputX) + "," + round(inputY) + ") mapped(" + round(screenX) + "," + round(screenY) + ") actual(" + round(x) + "," + round(y) + ") image(" + imageWidth + "x" + imageHeight + ") screen(" + metrics.widthPixels + "x" + metrics.heightPixels + ") cal(sx=" + compact(config.scaleX()) + ",sy=" + compact(config.scaleY()) + ",ox=" + round(config.offsetX()) + ",oy=" + round(config.offsetY()) + ")");
            return svc.tap(x, y);
        }
        if ("open_app".equals(name)) {
            String target = first(action, "package", "packageName", "pkg", "text", "appName", "app", "label");
            return openApp(target, first(action, "appName", "app", "label", "text"));
        }
        return false;
    }

    private int timeout(JSONObject action) {
        int value = action.optInt("timeoutMs", config.actionTimeoutMs());
        return Math.max(500, Math.min(30000, value));
    }

    private boolean waitFor(Check check, int timeoutMs) throws Exception {
        long end = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < end) {
            if (check.ok()) return true;
            Thread.sleep(250);
        }
        return false;
    }

    private String describe(JSONObject action) {
        String name = actionName(action);
        if (action.has("x") || action.has("y")) return name + "(" + round(action.optDouble("x", 0)) + "," + round(action.optDouble("y", 0)) + ")";
        if (action.has("text")) return name + "(" + action.optString("text") + ")";
        if (action.has("appName")) return name + "(" + action.optString("appName") + ")";
        if (action.has("app")) return name + "(" + action.optString("app") + ")";
        if (action.has("label")) return name + "(" + action.optString("label") + ")";
        if (action.has("package")) return name + "(" + action.optString("package") + ")";
        if (action.has("packageName")) return name + "(" + action.optString("packageName") + ")";
        return name;
    }

    private String round(double value) {
        return String.valueOf(Math.round(value));
    }

    private String compact(float value) {
        return String.format(java.util.Locale.US, "%.3f", value);
    }

    private String actionName(JSONObject action) {
        String raw = first(action, "action", "type", "name", "command", "operation");
        if (raw == null) return "unknown";
        String value = raw.trim();
        if (value.length() == 0) return "unknown";
        String key = value.replace("-", "_").replace(" ", "_").toLowerCase();
        if ("openapp".equals(key) || "launch_app".equals(key) || "start_app".equals(key) || "app_open".equals(key)) return "open_app";
        if ("taptext".equals(key) || "click_text".equals(key) || "clicktext".equals(key) || "tap_by_text".equals(key)) return "tap_text";
        if ("tapxy".equals(key) || "tap_coordinate".equals(key) || "tap_coordinates".equals(key) || "click_xy".equals(key) || "click".equals(key) || "tap".equals(key)) return "tap_xy";
        if ("inputtext".equals(key) || "set_text".equals(key) || "type_text".equals(key) || "input".equals(key)) return "input_text";
        if ("go_home".equals(key) || "press_home".equals(key) || "home_screen".equals(key)) return "home";
        if ("go_back".equals(key) || "press_back".equals(key)) return "back";
        if ("settings".equals(key)) return "open_settings";
        return key;
    }

    private String first(JSONObject action, String... keys) {
        for (String key : keys) {
            String value = action.optString(key, "");
            if (value != null && value.trim().length() > 0) return value;
        }
        return "";
    }

    private boolean openApp(String pkg, String appName) {
        PackageManager pm = context.getPackageManager();
        try {
            if (pkg == null || pkg.length() == 0 || !pkg.contains(".")) {
                String mapped = knownPackage(pkg);
                if (mapped.length() > 0) pkg = mapped;
            }
            if (pkg == null || pkg.length() == 0 || !pkg.contains(".")) pkg = findPackage(pm, appName);
            if (pkg == null || pkg.length() == 0) return false;
            Intent intent = pm.getLaunchIntentForPackage(pkg);
            if (intent == null) return false;
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            LogStore.add("ERR", e.getMessage());
            return false;
        }
    }

    private String findPackage(PackageManager pm, String appName) {
        if (appName == null || appName.trim().isEmpty()) return "";
        List<ApplicationInfo> apps = pm.getInstalledApplications(0);
        for (ApplicationInfo app : apps) {
            CharSequence label = pm.getApplicationLabel(app);
            if (label != null && label.toString().contains(appName)) return app.packageName;
        }
        return "";
    }

    private String knownPackage(String appName) {
        if (appName == null) return "";
        String name = appName.trim().toLowerCase();
        if (name.length() == 0) return "";
        if (name.contains("微信") || name.contains("wechat")) return "com.tencent.mm";
        if (name.contains("飞书") || name.contains("lark")) return "com.ss.android.lark";
        if (name.contains("抖音")) return "com.ss.android.ugc.aweme";
        if (name.contains("高德")) return "com.autonavi.minimap";
        if (name.contains("美团")) return "com.meituan.phoenix";
        return "";
    }

    private interface Check {
        boolean ok() throws Exception;
    }
}
