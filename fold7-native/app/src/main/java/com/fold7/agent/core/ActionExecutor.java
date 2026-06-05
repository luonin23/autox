package com.fold7.agent.core;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;
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
            String name = action.optString("action");
            LogStore.add("RUN", (i + 1) + "/" + actions.length() + " " + name);
            boolean ok = run(action);
            out.append(i + 1).append(". ").append(name).append(ok ? " ok" : " failed").append("\n");
            if (!ok) break;
        }
        return out.toString();
    }

    private boolean run(JSONObject action) throws Exception {
        String name = action.optString("action");
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
            return svc != null && svc.back();
        }
        if ("wait".equals(name)) {
            Thread.sleep(Math.max(100, Math.min(10000, action.optInt("ms", 800))));
            return true;
        }
        if ("input_text".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            return svc != null && svc.input(action.optString("text"));
        }
        if ("tap_text".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            return svc != null && svc.tapText(action.optString("text"));
        }
        if ("tap_xy".equals(name)) {
            Fold7AccessibilityService svc = Fold7AccessibilityService.instance();
            if (svc == null) return false;
            float x = (float) (action.optDouble("x", 0) * config.scaleX() + config.offsetX());
            float y = (float) (action.optDouble("y", 0) * config.scaleY() + config.offsetY());
            return svc.tap(x, y);
        }
        if ("open_app".equals(name)) {
            return openApp(action.optString("package"), action.optString("appName"));
        }
        return false;
    }

    private boolean openApp(String pkg, String appName) {
        PackageManager pm = context.getPackageManager();
        try {
            if (pkg == null || pkg.length() == 0) pkg = findPackage(pm, appName);
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
}
