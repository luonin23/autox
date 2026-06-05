package com.fold7.agent;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.fold7.agent.core.LogStore;

public class CoordinateCalibrationActivity extends Activity {
    private static final Object LOCK = new Object();
    private static volatile CoordinateCalibrationActivity current;
    private static volatile boolean ready;
    private static volatile Result result;

    public static void start(Context context) {
        synchronized (LOCK) {
            ready = false;
            result = null;
        }
        Intent intent = new Intent(context, CoordinateCalibrationActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    public static boolean waitReady(long timeoutMs) throws InterruptedException {
        long end = System.currentTimeMillis() + timeoutMs;
        synchronized (LOCK) {
            while (!ready && System.currentTimeMillis() < end) {
                LOCK.wait(Math.max(1, end - System.currentTimeMillis()));
            }
            return ready;
        }
    }

    public static Result waitResult(long timeoutMs) throws InterruptedException {
        long end = System.currentTimeMillis() + timeoutMs;
        synchronized (LOCK) {
            while (result == null && System.currentTimeMillis() < end) {
                LOCK.wait(Math.max(1, end - System.currentTimeMillis()));
            }
            return result;
        }
    }

    public static void closeIfOpen() {
        CoordinateCalibrationActivity activity = current;
        if (activity != null) activity.finish();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = this;
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        setContentView(new TargetView(this));
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        super.onDestroy();
    }

    private static void markReady() {
        synchronized (LOCK) {
            ready = true;
            LOCK.notifyAll();
        }
    }

    private void finishWith(Result value) {
        synchronized (LOCK) {
            result = value;
            LOCK.notifyAll();
        }
        LogStore.add("CAL", "AI calibration touch target(" + Math.round(value.targetX) + "," + Math.round(value.targetY) + ") actual(" + Math.round(value.actualX) + "," + Math.round(value.actualY) + ") offset(" + Math.round(value.offsetX) + "," + Math.round(value.offsetY) + ")");
        finish();
    }

    public static class Result {
        public final float targetX;
        public final float targetY;
        public final float actualX;
        public final float actualY;
        public final float offsetX;
        public final float offsetY;

        Result(float targetX, float targetY, float actualX, float actualY) {
            this.targetX = targetX;
            this.targetY = targetY;
            this.actualX = actualX;
            this.actualY = actualY;
            this.offsetX = targetX - actualX;
            this.offsetY = targetY - actualY;
        }
    }

    private class TargetView extends View {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);

        TargetView(Context context) {
            super(context);
            setBackgroundColor(Color.rgb(244, 242, 236));
        }

        @Override
        protected void onSizeChanged(int w, int h, int oldw, int oldh) {
            super.onSizeChanged(w, h, oldw, oldh);
            markReady();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float x = targetX();
            float y = targetY();
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(244, 242, 236));
            canvas.drawRect(0, 0, getWidth(), getHeight(), p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(8);
            p.setColor(Color.rgb(47, 125, 98));
            canvas.drawLine(x - 70, y, x + 70, y, p);
            canvas.drawLine(x, y - 70, x, y + 70, p);
            p.setStrokeWidth(3);
            canvas.drawCircle(x, y, 88, p);
            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setTextSize(42);
            p.setColor(Color.rgb(36, 35, 31));
            canvas.drawText("AI 坐标校准", getWidth() / 2f, 90, p);
            p.setTextSize(28);
            p.setColor(Color.rgb(113, 111, 104));
            canvas.drawText("请勿手动点击，系统会让 AI 识别并点击绿色十字中心", getWidth() / 2f, 140, p);
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            if (event.getAction() != MotionEvent.ACTION_UP) return true;
            int[] loc = new int[2];
            getLocationOnScreen(loc);
            finishWith(new Result(loc[0] + targetX(), loc[1] + targetY(), loc[0] + event.getX(), loc[1] + event.getY()));
            return true;
        }

        private float targetX() {
            return getWidth() * 0.5f;
        }

        private float targetY() {
            return getHeight() * 0.46f;
        }
    }
}
