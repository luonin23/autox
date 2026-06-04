/**
 * 脚本生成器 — 将任务计划转为可独立执行的 AutoX.js 脚本
 *
 * 功能：
 * 1. 接收意图 + 执行计划 → 生成完整可运行的 .js 文件内容
 * 2. 生成的脚本包含：注释说明、模块导入、停止机制、错误处理、日志记录
 * 3. 脚本可独立运行，不依赖对话界面
 *
 * 用法：
 *   const ScriptGenerator = require("./core/ScriptGenerator.js");
 *   const script = ScriptGenerator.generate("打开微信给肖波发你好", planSteps);
 *   files.write("/sdcard/xxx.js", script);
 */

/**
 * 生成脚本头部注释
 */
function _genHeader(instruction, intention) {
    const now = new Date().toLocaleString();
    return (
        "/**\n" +
        " * Fold7 Agent — 智能生成脚本\n" +
        " * ================================\n" +
        " * 生成时间: " + now + "\n" +
        " * 原始指令: " + (instruction || "") + "\n" +
        " * 识别意图: " + (intention.intent || "unknown") + "\n" +
        " * 目标应用: " + (intention.app || "—") + "\n" +
        " * ================================\n" +
        " * 按【音量上键】可随时停止执行\n" +
        " */\n\n"
    );
}

/**
 * 生成模块导入代码
 */
function _genImports() {
    return (
        "// ========== 核心模块导入 ==========\n" +
        "const StopHelper = require('./core/StopHelper.js');\n" +
        "const UIAutomator = require('./core/UIAutomator.js');\n" +
        "const Logger = require('./core/Logger.js');\n" +
        "\n"
    );
}

/**
 * 生成配置代码
 */
function _genConfig() {
    return (
        "// ========== 执行配置 ==========\n" +
        "const CONFIG = {\n" +
        "    maxSteps: 15,        // 最大执行步数\n" +
        "    defaultDelay: 1500,  // 默认操作间隔（毫秒）\n" +
        "    retryCount: 2,       // 出错重试次数\n" +
        "};\n\n"
    );
}

/**
 * 生成步骤数据定义
 */
function _genStepsData(intention, planSteps) {
    const intentJson = JSON.stringify(intention, null, 4);
    const planJson = JSON.stringify(planSteps, null, 4);
    return (
        "// ========== 语义解析结果 ==========\n" +
        "const INTENTION = " + intentJson + ";\n\n" +
        "// ========== 执行计划 ==========\n" +
        "const PLAN_STEPS = " + planJson + ";\n\n"
    );
}

/**
 * 生成主执行逻辑
 */
function _genMainLogic() {
    return (
        "// ========== 主执行器 ==========\n" +
        "function main() {\n" +
        "    // 注册停止监听\n" +
        "    StopHelper.setup();\n" +
        "    StopHelper.showHint();\n" +
        "\n" +
        "    Logger.taskStart('script', INTENTION.raw, null);\n" +
        "    toastLog('🚀 开始执行: ' + INTENTION.raw);\n" +
        "\n" +
        "    let success = true;\n" +
        "    let executedSteps = 0;\n" +
        "\n" +
        "    for (let i = 0; i < PLAN_STEPS.length; i++) {\n" +
        "        // 检查是否被用户停止\n" +
        "        if (StopHelper.check()) {\n" +
        "            toastLog('⏹️ 脚本已被用户停止');\n" +
        "            success = false;\n" +
        "            break;\n" +
        "        }\n" +
        "\n" +
        "        const step = PLAN_STEPS[i];\n" +
        "        const stepNum = i + 1;\n" +
        "\n" +
        "        log('[' + stepNum + '/' + PLAN_STEPS.length + '] ' +\n" +
        "            step.action + ' | ' + (step.reason || ''));\n" +
        "\n" +
        "        try {\n" +
        "            Logger.stepLog(stepNum, step.action, step.target || '', 'ok');\n" +
        "\n" +
        "            const result = UIAutomator.executeCommand(step);\n" +
        "            executedSteps++;\n" +
        "\n" +
        "            // 如果步骤指定了延迟，执行等待\n" +
        "            if (step.delay_ms && step.delay_ms > 0) {\n" +
        "                StopHelper.safeSleep(step.delay_ms);\n" +
        "            } else {\n" +
        "                // 默认间隔，防止操作过快\n" +
        "                StopHelper.safeSleep(CONFIG.defaultDelay);\n" +
        "            }\n" +
        "\n" +
        "            // 如果指令表示完成，提前结束\n" +
        "            if (step.action === 'done') {\n" +
        "                break;\n" +
        "            }\n" +
        "        } catch (e) {\n" +
        "            log('❌ 步骤失败: ' + e.message);\n" +
        "            Logger.errorLog(e.message, null);\n" +
        "\n" +
        "            // 出错后尝试简单恢复\n" +
        "            if (CONFIG.retryCount > 0) {\n" +
        "                log('🔄 等待后重试...');\n" +
        "                StopHelper.safeSleep(2000);\n" +
        "                try {\n" +
        "                    UIAutomator.executeCommand(step);\n" +
        "                    executedSteps++;\n" +
        "                } catch (e2) {\n" +
        "                    log('❌ 重试仍然失败: ' + e2.message);\n" +
        "                    success = false;\n" +
        "                    break;\n" +
        "                }\n" +
        "            } else {\n" +
        "                success = false;\n" +
        "                break;\n" +
        "            }\n" +
        "        }\n" +
        "    }\n" +
        "\n" +
        "    // 记录结果\n" +
        "    Logger.taskEnd('script', success, success ? '任务完成' : '任务失败或中断', executedSteps);\n" +
        "\n" +
        "    if (success) {\n" +
        "        toastLog('✅ 任务执行完成（共 ' + executedSteps + ' 步）');\n" +
        "    } else {\n" +
        "        toastLog('❌ 任务未完全完成（完成 ' + executedSteps + ' 步）');\n" +
        "    }\n" +
        "\n" +
        "    // 清理资源\n" +
        "    StopHelper.teardown();\n" +
        "}\n" +
        "\n" +
        "// ========== 启动 ==========\n" +
        "main();\n"
    );
}

/**
 * 生成完整脚本
 * @param {string} instruction 用户原始指令
 * @param {object} intention 语义解析结果
 * @param {array} planSteps 执行计划步骤数组
 * @returns {string} 完整可执行的脚本内容
 */
function generate(instruction, intention, planSteps) {
    if (!planSteps || planSteps.length === 0) {
        throw new Error("执行计划为空，无法生成脚本");
    }

    const parts = [
        _genHeader(instruction, intention),
        _genImports(),
        _genConfig(),
        _genStepsData(intention, planSteps),
        _genMainLogic(),
    ];

    return parts.join("");
}

/**
 * 生成一个快速执行的内联脚本（用于 engines.execScript）
 * 不依赖外部文件路径，所有逻辑自包含
 */
function generateInline(instruction, intention, planSteps) {
    if (!planSteps || planSteps.length === 0) {
        throw new Error("执行计划为空");
    }

    // 内联版本：使用相对路径 require，适配 engines.execScript 环境
    return (
        "// 内联执行脚本\n" +
        "(function() {\n" +
        "    var StopHelper = require('./core/StopHelper.js');\n" +
        "    var UIAutomator = require('./core/UIAutomator.js');\n" +
        "    var Logger = require('./core/Logger.js');\n" +
        "    var PLAN_STEPS = " + JSON.stringify(planSteps) + ";\n" +
        "    StopHelper.setup();\n" +
        "    Logger.taskStart('inline', " + JSON.stringify(instruction) + ", null);\n" +
        "    for (var i = 0; i < PLAN_STEPS.length; i++) {\n" +
        "        if (StopHelper.check()) break;\n" +
        "        var s = PLAN_STEPS[i];\n" +
        "        try {\n" +
        "            UIAutomator.executeCommand(s);\n" +
        "            if (s.delay_ms) sleep(s.delay_ms);\n" +
        "            else sleep(1500);\n" +
        "        } catch (e) {\n" +
        "            log('步骤失败: ' + e.message);\n" +
        "        }\n" +
        "    }\n" +
        "    Logger.taskEnd('inline', true, '完成', PLAN_STEPS.length);\n" +
        "    StopHelper.teardown();\n" +
        "})();\n"
    );
}

module.exports = {
    generate: generate,
    generateInline: generateInline,
};
