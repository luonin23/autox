package com.fold7.agent.core;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ConfigStore {
    private static final String PREF = "fold7_config";
    private final SharedPreferences prefs;

    public ConfigStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public String provider() { return prefs.getString("provider", "kimi"); }
    public String format() { return prefs.getString("format", "openai"); }
    public String baseUrl() { return prefs.getString("baseUrl", "https://api.kimi.com/coding"); }
    public String apiKey() { return prefs.getString("apiKey", ""); }
    public String model() { return prefs.getString("model", "kimi-k2-0711-preview"); }
    public String activeModelId() { return prefs.getString("activeModelId", "default"); }
    public String activeModelName() { return prefs.getString("activeModelName", "默认模型"); }
    public int maxSteps() { return prefs.getInt("maxSteps", 24); }
    public int actionTimeoutMs() { return prefs.getInt("actionTimeoutMs", 8000); }
    public float offsetX() { return prefs.getFloat("offsetX", 0f); }
    public float offsetY() { return prefs.getFloat("offsetY", 0f); }
    public float scaleX() { return prefs.getFloat("scaleX", 1f); }
    public float scaleY() { return prefs.getFloat("scaleY", 1f); }

    public boolean hasModel() {
        return apiKey().trim().length() > 0 && baseUrl().trim().length() > 0 && model().trim().length() > 0;
    }

    public void save(String provider, String format, String baseUrl, String apiKey, String model, int maxSteps) {
        save("默认模型", provider, format, baseUrl, apiKey, model, maxSteps);
    }

    public void save(String name, String provider, String format, String baseUrl, String apiKey, String model, int maxSteps) {
        prefs.edit()
            .putString("activeModelId", "default")
            .putString("activeModelName", empty(name, "默认模型"))
            .putString("provider", provider)
            .putString("format", format)
            .putString("baseUrl", baseUrl)
            .putString("apiKey", apiKey)
            .putString("model", model)
            .putInt("maxSteps", Math.max(4, Math.min(80, maxSteps)))
            .apply();
        upsertModel(new ModelProfile("default", empty(name, "默认模型"), provider, format, baseUrl, apiKey, model));
    }

    public void saveCustomModel(String name, String provider, String format, String baseUrl, String apiKey, String model) {
        String id = "model-" + System.currentTimeMillis();
        ModelProfile profile = new ModelProfile(id, empty(name, model), provider, format, baseUrl, apiKey, model);
        upsertModel(profile);
        activateModel(id);
    }

    public boolean activateModel(String id) {
        for (ModelProfile profile : modelProfiles()) {
            if (!profile.id.equals(id)) continue;
            prefs.edit()
                .putString("activeModelId", profile.id)
                .putString("activeModelName", profile.name)
                .putString("provider", profile.provider)
                .putString("format", profile.format)
                .putString("baseUrl", profile.baseUrl)
                .putString("apiKey", profile.apiKey)
                .putString("model", profile.model)
                .apply();
            return true;
        }
        return false;
    }

    public List<ModelProfile> modelProfiles() {
        ArrayList<ModelProfile> list = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(prefs.getString("modelProfiles", "[]"));
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                list.add(new ModelProfile(
                    item.optString("id"),
                    item.optString("name"),
                    item.optString("provider"),
                    item.optString("format"),
                    item.optString("baseUrl"),
                    item.optString("apiKey"),
                    item.optString("model")
                ));
            }
        } catch (Exception ignored) {
        }
        if (list.isEmpty()) {
            list.add(new ModelProfile("default", activeModelName(), provider(), format(), baseUrl(), apiKey(), model()));
        }
        return list;
    }

    private void upsertModel(ModelProfile profile) {
        try {
            JSONArray array = new JSONArray();
            boolean replaced = false;
            for (ModelProfile item : modelProfiles()) {
                ModelProfile next = item.id.equals(profile.id) ? profile : item;
                if (item.id.equals(profile.id)) replaced = true;
                array.put(next.toJson());
            }
            if (!replaced) array.put(profile.toJson());
            prefs.edit().putString("modelProfiles", array.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    public void saveCalibration(float offsetX, float offsetY, float scaleX, float scaleY) {
        prefs.edit()
            .putFloat("offsetX", offsetX)
            .putFloat("offsetY", offsetY)
            .putFloat("scaleX", scaleX <= 0 ? 1f : scaleX)
            .putFloat("scaleY", scaleY <= 0 ? 1f : scaleY)
            .apply();
    }

    public void saveActionTimeoutMs(int timeoutMs) {
        prefs.edit().putInt("actionTimeoutMs", Math.max(500, Math.min(30000, timeoutMs))).apply();
    }

    public boolean importAutoXConfig() {
        String[] paths = new String[] {
            "/sdcard/AutoX/fold7-agent/autojs-scripts/config.js",
            "/sdcard/Download/fold7-config.js",
            "/storage/emulated/0/AutoX/fold7-agent/autojs-scripts/config.js"
        };
        for (String path : paths) {
            File file = new File(path);
            if (!file.exists()) continue;
            try {
                StringBuilder builder = new StringBuilder();
                BufferedReader reader = new BufferedReader(new FileReader(file));
                String line;
                while ((line = reader.readLine()) != null) builder.append(line).append('\n');
                reader.close();
                String text = builder.toString();
                String provider = first(text, "provider");
                String format = first(text, "format");
                String baseUrl = first(text, "baseUrl");
                String apiKey = first(text, "apiKey");
                String model = first(text, "model");
                save(empty(provider, provider()), empty(format, format()), empty(baseUrl, baseUrl()),
                    empty(apiKey, apiKey()), empty(model, model()), maxSteps());
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
        return false;
    }

    private static String empty(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private static String first(String text, String key) {
        Pattern pattern = Pattern.compile("[\"']?" + key + "[\"']?\\s*[:=]\\s*['\\\"]([^'\\\"]*)['\\\"]");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1) : "";
    }

    public static class ModelProfile {
        public final String id;
        public final String name;
        public final String provider;
        public final String format;
        public final String baseUrl;
        public final String apiKey;
        public final String model;

        public ModelProfile(String id, String name, String provider, String format, String baseUrl, String apiKey, String model) {
            this.id = empty(id, "default");
            this.name = empty(name, "未命名模型");
            this.provider = empty(provider, "custom");
            this.format = empty(format, "openai");
            this.baseUrl = empty(baseUrl, "");
            this.apiKey = empty(apiKey, "");
            this.model = empty(model, "");
        }

        JSONObject toJson() throws Exception {
            return new JSONObject()
                .put("id", id)
                .put("name", name)
                .put("provider", provider)
                .put("format", format)
                .put("baseUrl", baseUrl)
                .put("apiKey", apiKey)
                .put("model", model);
        }
    }
}
