package com.fold7.agent.core;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class ModelClient {
    private final ConfigStore config;

    public ModelClient(ConfigStore config) {
        this.config = config;
    }

    public String test() throws Exception {
        return complete("Return exactly: Fold7 connection ok", "Connection check");
    }

    public String complete(String system, String user) throws Exception {
        String url = endpoint();
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        if ("anthropic".equals(config.format())) {
            conn.setRequestProperty("x-api-key", config.apiKey());
            conn.setRequestProperty("anthropic-version", "2023-06-01");
        } else {
            conn.setRequestProperty("Authorization", "Bearer " + config.apiKey());
        }
        byte[] payload = body(system, user).toString().getBytes("UTF-8");
        OutputStream output = conn.getOutputStream();
        output.write(payload);
        output.close();
        int code = conn.getResponseCode();
        InputStream input = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String text = read(input);
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + ": " + text);
        return parse(text);
    }

    private String endpoint() {
        String base = config.baseUrl().trim();
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        base = base.replaceAll("/chat/completions$", "").replaceAll("/messages$", "");
        boolean kimi = base.contains("kimi.com");
        if ("anthropic".equals(config.format())) {
            if (kimi && base.endsWith("/coding")) return base + "/v1/messages";
            if (base.endsWith("/v1")) return base + "/messages";
            return base + "/v1/messages";
        }
        if (kimi && base.endsWith("/coding")) return base + "/v1/chat/completions";
        if (base.endsWith("/v1")) return base + "/chat/completions";
        return base + "/v1/chat/completions";
    }

    private JSONObject body(String system, String user) throws Exception {
        JSONObject body = new JSONObject();
        body.put("model", config.model());
        body.put("temperature", 0.2);
        if ("anthropic".equals(config.format())) {
            body.put("max_tokens", 1800);
            body.put("system", system);
            JSONArray messages = new JSONArray();
            messages.put(new JSONObject().put("role", "user").put("content", user));
            body.put("messages", messages);
        } else {
            JSONArray messages = new JSONArray();
            messages.put(new JSONObject().put("role", "system").put("content", system));
            messages.put(new JSONObject().put("role", "user").put("content", user));
            body.put("messages", messages);
        }
        return body;
    }

    private String parse(String text) throws Exception {
        JSONObject json = new JSONObject(text);
        if (json.has("choices")) {
            return json.getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content");
        }
        if (json.has("content")) {
            JSONArray arr = json.getJSONArray("content");
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < arr.length(); i++) out.append(arr.getJSONObject(i).optString("text"));
            return out.toString();
        }
        return text;
    }

    private static String read(InputStream input) throws Exception {
        if (input == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(input, "UTF-8"));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) builder.append(line);
        reader.close();
        return builder.toString();
    }
}
