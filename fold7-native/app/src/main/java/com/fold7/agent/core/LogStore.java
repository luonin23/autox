package com.fold7.agent.core;

import android.text.format.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class LogStore {
    public interface Listener { void onLogChanged(); }
    private static final List<String> logs = new ArrayList<>();
    private static final List<String> history = new ArrayList<>();
    private static Listener listener;

    public static void setListener(Listener value) { listener = value; }
    public static List<String> logs() { return new ArrayList<>(logs); }
    public static List<String> history() { return new ArrayList<>(history); }

    public static void add(String level, String message) {
        String time = DateFormat.format("HH:mm:ss", new Date()).toString();
        logs.add(0, time + "  " + level + "  " + message);
        while (logs.size() > 120) logs.remove(logs.size() - 1);
        if (listener != null) listener.onLogChanged();
    }

    public static void task(String message) {
        history.add(0, message);
        while (history.size() > 40) history.remove(history.size() - 1);
        add("TASK", message);
    }
}

