package com.fold7.agent;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import com.fold7.agent.core.LogStore;
import java.util.List;

public class Fold7AccessibilityService extends AccessibilityService {
    private static Fold7AccessibilityService current;

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

    public boolean input(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        AccessibilityNodeInfo edit = findEditable(root);
        if (edit == null) return false;
        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
        return edit.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
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
}
