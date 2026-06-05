package com.fold7.agent.core;

import android.content.Context;
import com.fold7.agent.CoordinateCalibrationActivity;
import com.fold7.agent.Fold7AccessibilityService;
import org.json.JSONObject;

public class RuntimeCalibrator {
    private static final int MAX_OFFSET = 96;

    public static String calibrate(Context context, ModelClient model, ActionExecutor executor, ConfigStore config) throws Exception {
        try {
            RuntimeControl.throwIfStopped();
            Fold7AccessibilityService service = Fold7AccessibilityService.instance();
            if (service == null) throw new Exception("无障碍服务未开启，无法执行 AI 坐标校准");
            LogStore.add("CAL", "starting AI coordinate calibration");
            config.saveCalibration(0f, 0f, 1f, 1f);
            LogStore.add("CAL", "cleared previous coordinate calibration");
            CoordinateCalibrationActivity.start(context);
            if (!CoordinateCalibrationActivity.waitReady(3000)) throw new Exception("AI 坐标校准页未就绪");
            Thread.sleep(350);
            String image = service.screenshotBase64();
            if (image.length() == 0) throw new Exception("AI 坐标校准截图失败");
            String answer = model.completeWithImage(systemPrompt(), userPrompt(service.snapshot()), image);
            JSONObject json = ChatEngine.extractJson(answer);
            double x = json.optDouble("x", -1);
            double y = json.optDouble("y", -1);
            if (x <= 0 || y <= 0) throw new Exception("AI 坐标校准未返回有效坐标：" + answer);
            LogStore.add("CAL", "AI calibration target from model: " + Math.round(x) + "," + Math.round(y));
            executor.tapCalibration(x, y);
            CoordinateCalibrationActivity.Result result = CoordinateCalibrationActivity.waitResult(3500);
            if (result == null) throw new Exception("AI 坐标校准点击未命中校准页");
            if (Math.abs(result.offsetX) > MAX_OFFSET || Math.abs(result.offsetY) > MAX_OFFSET) {
                config.saveCalibration(0f, 0f, 1f, 1f);
                String summary = "AI 坐标校准偏移过大，已忽略并保持零偏移：offset(" + Math.round(result.offsetX) + "," + Math.round(result.offsetY) + ")";
                LogStore.add("CAL", summary);
                return summary;
            }
            config.saveCalibration(result.offsetX, result.offsetY, 1f, 1f);
            String summary = "AI 坐标校准完成：offset(" + Math.round(result.offsetX) + "," + Math.round(result.offsetY) + ")";
            LogStore.add("CAL", summary);
            return summary;
        } catch (Exception e) {
            CoordinateCalibrationActivity.closeIfOpen();
            LogStore.add("ERR", "AI coordinate calibration failed: " + e.getMessage());
            throw e;
        }
    }

    private static String systemPrompt() {
        return "你是 Fold7 Agent 的坐标校准视觉模型。只返回严格 JSON，不要输出多余文字。格式：{\"x\":123,\"y\":456}。x/y 必须是当前截图中绿色十字中心的真实截图像素坐标；如果不确定，返回最接近绿色十字交点中心的位置。";
    }

    private static String userPrompt(String observation) {
        return "请识别截图里的绿色十字校准靶标中心点，返回它在截图中的像素坐标。当前无障碍观察：\n" + observation;
    }
}
