package com.fold7.agent;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Path;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import com.fold7.agent.core.LogStore;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class Fold7AccessibilityService extends AccessibilityService {
    private static Fold7AccessibilityService current;
    private volatile int lastScreenshotWidth;
    private volatile int lastScreenshotHeight;

    public static Fold7AccessibilityService instance() {
        return current;
    }

    @Override
    public void onServiceConnected() {
        current = this;
        LogStore.add("SYS", "Accessibility service connected");
    }

    @Override
    public void onDestroy() {
        if (current == this) current = null;
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
    }

    @Override
    public void onInterrupt() {
        LogStore.add("SYS", "Accessibility service interrupted");
    }

    public boolean home() {
        return performGlobalAction(GLOBAL_ACTION_HOME);
    }

    public boolean back() {
        return performGlobalAction(GLOBAL_ACTION_BACK);
    }

    public boolean tapText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || text == null || text.length() == 0) return false;
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        for (AccessibilityNodeInfo node : nodes) {
            AccessibilityNodeInfo target = clickableParent(node);
            if (target != null && target.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
        }
        return false;
    }

    public boolean tap(float x, float y) {
        Path path = new Path();
        path.moveTo(x, y);
        GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(path, 0, 80);
        GestureDescription gesture = new GestureDescription.Builder().addStroke(stroke).build();
        return dispatchGesture(gesture, null, null);
    }

    public boolean swipe(float fromX, float fromY, float toX, float toY, long durationMs) {
        Path path = new Path();
        path.moveTo(fromX, fromY);
        path.lineTo(toX, toY);
        GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(path, 0, Math.max(180, durationMs));
        GestureDescription gesture = new GestureDescription.Builder().addStroke(stroke).build();
        return dispatchGesture(gesture, null, null);
    }

    public int screenshotWidth() {
        return lastScreenshotWidth;
    }

    public int screenshotHeight() {
        return lastScreenshotHeight;
    }

    public boolean input(String text) {
        ArrayList<AccessibilityNodeInfo> roots = new ArrayList<>();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root != null) roots.add(root);
        for (AccessibilityWindowInfo window : getWindows()) {
            AccessibilityNodeInfo windowRoot = window.getRoot();
            if (windowRoot != null) roots.add(windowRoot);
        }
        for (AccessibilityNodeInfo item : roots) {
            AccessibilityNodeInfo focus = item.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            if (setText(focus, text)) return true;
        }
        for (AccessibilityNodeInfo item : roots) {
            AccessibilityNodeInfo edit = findEditable(item);
            if (setText(edit, text)) return true;
        }
        for (AccessibilityNodeInfo item : roots) {
            AccessibilityNodeInfo focus = item.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            if (pasteText(focus, text)) return true;
        }
        return false;
    }

    private boolean setText(AccessibilityNodeInfo edit, String text) {
        if (edit == null) return false;
        edit.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
        boolean ok = edit.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        if (ok) LogStore.add("RUN", "input_text set_text ok");
        return ok;
    }

    private boolean pasteText(AccessibilityNodeInfo edit, String text) {
        if (edit == null) return false;
        edit.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) return false;
        clipboard.setPrimaryClip(ClipData.newPlainText("fold7_input", text));
        boolean ok = edit.performAction(AccessibilityNodeInfo.ACTION_PASTE);
        if (ok) LogStore.add("RUN", "input_text paste ok");
        return ok;
    }

    public String snapshot() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "accessibility_root: unavailable";
        StringBuilder out = new StringBuilder();
        DisplayMetrics metrics = realMetrics();
        out.append("display=").append(metrics.widthPixels).append("x").append(metrics.heightPixels).append("\n");
        if (lastScreenshotWidth > 0 && lastScreenshotHeight > 0) {
            out.append("screenshot=").append(lastScreenshotWidth).append("x").append(lastScreenshotHeight).append("\n");
        }
        out.append("package=").append(root.getPackageName()).append("\n");
        collect(root, out, 0, new int[] {0});
        return out.toString();
    }

    public String screenshotBase64() {
        if (Build.VERSION.SDK_INT < 30) return "";
        final String[] out = new String[] {""};
        final CountDownLatch latch = new CountDownLatch(1);
        takeScreenshot(0, getMainExecutor(), new TakeScreenshotCallback() {
            @Override
            public void onSuccess(ScreenshotResult result) {
                try {
                    Bitmap bitmap = Bitmap.wrapHardwareBuffer(result.getHardwareBuffer(), result.getColorSpace());
                    if (bitmap == null) {
                        latch.countDown();
                        return;
                    }
                    Bitmap copy = bitmap.copy(Bitmap.Config.ARGB_8888, false);
                    bitmap.recycle();
                    lastScreenshotWidth = copy.getWidth();
                    lastScreenshotHeight = copy.getHeight();
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    copy.compress(Bitmap.CompressFormat.JPEG, 70, bytes);
                    copy.recycle();
                    out[0] = Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
                } catch (Exception e) {
                    LogStore.add("ERR", "screenshot failed: " + e.getMessage());
                }
                latch.countDown();
            }

            @Override
            public void onFailure(int errorCode) {
                LogStore.add("ERR", "screenshot error: " + errorCode);
                latch.countDown();
            }
        });
        try {
            latch.await(2500, TimeUnit.MILLISECONDS);
        } catch (Exception ignored) {
        }
        return out[0];
    }

    private AccessibilityNodeInfo clickableParent(AccessibilityNodeInfo node) {
        AccessibilityNodeInfo cur = node;
        for (int i = 0; cur != null && i < 6; i++) {
            if (cur.isClickable()) return cur;
            cur = cur.getParent();
        }
        return node;
    }

    private AccessibilityNodeInfo findEditable(AccessibilityNodeInfo node) {
        if (node.isEditable()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            AccessibilityNodeInfo hit = findEditable(child);
            if (hit != null) return hit;
        }
        return null;
    }

    private void collect(AccessibilityNodeInfo node, StringBuilder out, int depth, int[] count) {
        if (node == null || depth > 5 || count[0] > 80) return;
        CharSequence text = node.getText();
        CharSequence desc = node.getContentDescription();
        boolean useful = (text != null && text.length() > 0) || (desc != null && desc.length() > 0) || node.isEditable() || node.isClickable();
        if (useful) {
            count[0]++;
            for (int i = 0; i < depth; i++) out.append("  ");
            out.append("- class=").append(shortName(node.getClassName()));
            if (text != null && text.length() > 0) out.append(" text=\"").append(limit(text.toString())).append("\"");
            if (desc != null && desc.length() > 0) out.append(" desc=\"").append(limit(desc.toString())).append("\"");
            if (node.isEditable()) out.append(" editable");
            if (node.isClickable()) out.append(" clickable");
            out.append("\n");
        }
        for (int i = 0; i < node.getChildCount(); i++) collect(node.getChild(i), out, depth + 1, count);
    }

    private String shortName(CharSequence value) {
        if (value == null) return "";
        String text = value.toString();
        int i = text.lastIndexOf('.');
        return i >= 0 ? text.substring(i + 1) : text;
    }

    private String limit(String value) {
        String clean = value.replace("\n", " ").replace("\"", "'");
        return clean.length() > 48 ? clean.substring(0, 48) : clean;
    }

    private DisplayMetrics realMetrics() {
        DisplayMetrics metrics = new DisplayMetrics();
        WindowManager manager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (manager != null) manager.getDefaultDisplay().getRealMetrics(metrics);
        if (metrics.widthPixels <= 0 || metrics.heightPixels <= 0) return getResources().getDisplayMetrics();
        return metrics;
    }

}
