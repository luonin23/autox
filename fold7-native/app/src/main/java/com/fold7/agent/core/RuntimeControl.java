package com.fold7.agent.core;

public class RuntimeControl {
    private static volatile boolean stopRequested;

    public static void reset() {
        stopRequested = false;
    }

    public static void requestStop() {
        stopRequested = true;
    }

    public static boolean isStopRequested() {
        return stopRequested;
    }

    public static void throwIfStopped() throws Exception {
        if (stopRequested) throw new Exception("用户已停止运行");
    }
}
