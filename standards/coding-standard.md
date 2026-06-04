# Fold7 Agent — AutoX.js 编码规范

## 1. 文件结构规范

```
script_name.js
├── 文件头注释（生成信息）
├── "ui"; 声明（如需要）
├── IIFE 包裹（避免全局污染）
├── 模块导入
├── 常量定义
├── 主函数
└── IIFE 调用
```

## 2. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | 小写，单词用连字符 | `wechat-send.js` |
| 变量 | 驼峰式 | `userName`, `stepIndex` |
| 常量 | 全大写下划线 | `MAX_RETRY`, `LOG_DIR` |
| 函数 | 驼峰式，动词开头 | `sendMessage()`, `checkStatus()` |
| 模块 | 帕斯卡式 | `UIAutomator.js`, `StopHelper.js` |

## 3. 脚本模板

```javascript
/**
 * 脚本名称
 * 功能描述
 * 生成时间: YYYY-MM-DD HH:mm:ss
 */
"ui";

(function() {
    // ========== 模块导入 ==========
    var UIAutomator = require('./core/UIAutomator.js');
    var StopHelper = require('./core/StopHelper.js');
    var Logger = require('./core/Logger.js');

    // ========== 常量 ==========
    var MAX_STEPS = 15;
    var DEFAULT_DELAY = 1500;

    // ========== 主逻辑 ==========
    function main() {
        StopHelper.setup();
        Logger.taskStart('script', '任务描述', null);

        try {
            // 执行步骤...
            Logger.taskEnd('script', true, '完成', 步数);
        } catch (e) {
            Logger.errorLog(e.message, null);
            log('❌ 执行出错: ' + e.message);
        } finally {
            StopHelper.teardown();
        }
    }

    // ========== 启动 ==========
    main();
})();
```

## 4. 操作间隔规范

| 场景 | 最小延迟 | 推荐延迟 |
|------|---------|---------|
| 启动应用 | 3000ms | 4000-5000ms |
| 微信操作 | 3000ms | 3000-5000ms |
| 普通点击 | 1000ms | 1500-2000ms |
| 输入文字 | 800ms | 1000-1500ms |
| 滑动 | 1000ms | 1500ms |
| 返回/主页 | 800ms | 1000ms |

## 5. 错误处理规范

1. **不要直接 throw**：捕获异常后记录日志，尝试优雅退出
2. **节点查找失败**：使用 `text` → `desc` → `textContains` → `className` 回退
3. **弹窗处理**：关键操作前检查常见弹窗（确定/允许/关闭/暂不）
4. **超时处理**：设置合理超时，超时后记录并退出

## 6. 日志规范

```javascript
// ✅ 正确
log('▶️ 执行: click | 发送按钮 | 点击发送');
log('✅ 成功: 消息已发送');
log('❌ 失败: 未找到发送按钮');
log('⚠️ 警告: 节点不可点击，尝试坐标点击');

// ❌ 错误
log('ok');  // 无意义
log(e);     // 直接输出对象可能不友好
```

## 7. 防检测规范

1. 操作间隔使用随机延迟 `humanDelay(500, 2000)`
2. 滑动使用贝塞尔曲线 `bezierSwipe()`
3. 避免固定坐标点击，优先使用文字查找
4. 连续操作间插入随机等待

## 8. 安全规范

1. 脚本执行前调用 `StopHelper.setup()`
2. 循环中检查 `StopHelper.check()`
3. 敏感操作（支付、发送消息）前二次确认
4. 不要硬编码 API Key 等敏感信息
