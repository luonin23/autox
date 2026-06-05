package com.fold7.agent.core;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
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
    public int maxSteps() { return prefs.getInt("maxSteps", 24); }
    public float offsetX() { return prefs.getFloat("offsetX", 0f); }
    public float offsetY() { return prefs.getFloat("offsetY", 0f); }
    public float scaleX() { return prefs.getFloat("scaleX", 1f); }
    public float scaleY() { return prefs.getFloat("scaleY", 1f); }

    public boolean hasModel() {
        return apiKey().trim().length() > 0 && baseUrl().trim().length() > 0 && model().trim().length() > 0;
    }

    public void save(String provider, String format, String baseUrl, String apiKey, String model, int maxSteps) {
        prefs.edit()
            .putString("provider", provider)
            .putString("format", format)
            .putString("baseUrl", baseUrl)
            .putString("apiKey", apiKey)
            .putString("model", model)
            .putInt("maxSteps", Math.max(4, Math.min(80, maxSteps)))
            .apply();
    }

    public void saveCalibration(float offsetX, float offsetY, float scaleX, float scaleY) {
        prefs.edit()
            .putFloat("offsetX", offsetX)
            .putFloat("offsetY", offsetY)
            .putFloat("scaleX", scaleX <= 0 ? 1f : scaleX)
            .putFloat("scaleY", scaleY <= 0 ? 1f : scaleY)
            .apply();
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
}
