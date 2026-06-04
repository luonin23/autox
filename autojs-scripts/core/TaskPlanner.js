/**
 * 任务规划器
 * 将语义解析结果分解为可执行步骤序列
 */

/**
 * 根据意图生成执行计划
 * 返回步骤数组：[{action, target, text, delay_ms, reason}]
 */
function plan(intention) {
    if (!intention || !intention.intent) {
        return [];
    }

    const steps = [];
    const intent = intention.intent;

    switch (intent) {
        case "send_message": {
            const app = intention.app || "微信";
            const contact = intention.target;
            const content = intention.content || "";

            steps.push({
                action: "launch",
                target: app,
                delay_ms: 3000,
                reason: "打开" + app,
            });
            steps.push({
                action: "click",
                target: "搜索",
                delay_ms: 1500,
                reason: "点击搜索框",
            });
            steps.push({
                action: "input",
                target: "搜索",
                text: contact,
                delay_ms: 2000,
                reason: "输入联系人名称",
            });
            steps.push({
                action: "click",
                target: contact,
                delay_ms: 2000,
                reason: "选择联系人",
            });
            if (content) {
                steps.push({
                    action: "input",
                    target: "发消息",
                    text: content,
                    delay_ms: 1000,
                    reason: "输入消息内容",
                });
                steps.push({
                    action: "click",
                    target: "发送",
                    delay_ms: 1000,
                    reason: "点击发送",
                });
            }
            steps.push({
                action: "done",
                reason: "消息发送完成",
            });
            break;
        }

        case "clock_in": {
            const app = intention.app || "钉钉";
            const button = intention.target || "上班打卡";

            steps.push({
                action: "launch",
                target: app,
                delay_ms: 3000,
                reason: "打开" + app,
            });
            steps.push({
                action: "click",
                target: "工作台",
                delay_ms: 2000,
                reason: "进入工作台",
            });
            steps.push({
                action: "click",
                target: "考勤打卡",
                delay_ms: 2000,
                reason: "进入考勤打卡页面",
            });
            steps.push({
                action: "click",
                target: button,
                delay_ms: 2000,
                reason: "点击" + button,
            });
            steps.push({
                action: "done",
                reason: "打卡完成",
            });
            break;
        }

        case "search": {
            const app = intention.app || "淘宝";
            const keyword = intention.target || "";

            steps.push({
                action: "launch",
                target: app,
                delay_ms: 3000,
                reason: "打开" + app,
            });
            steps.push({
                action: "click",
                target: "搜索",
                delay_ms: 1500,
                reason: "点击搜索框",
            });
            steps.push({
                action: "input",
                target: "搜索",
                text: keyword,
                delay_ms: 1500,
                reason: "输入搜索关键词",
            });
            steps.push({
                action: "click",
                target: "搜索",
                delay_ms: 2000,
                reason: "执行搜索",
            });
            steps.push({
                action: "done",
                reason: "搜索完成",
            });
            break;
        }

        case "navigate": {
            const app = intention.app || "高德地图";
            const destination = intention.target || "";

            steps.push({
                action: "launch",
                target: app,
                delay_ms: 3000,
                reason: "打开" + app,
            });
            steps.push({
                action: "click",
                target: "搜索地点",
                delay_ms: 1500,
                reason: "点击搜索框",
            });
            steps.push({
                action: "input",
                target: "搜索地点",
                text: destination,
                delay_ms: 1500,
                reason: "输入目的地",
            });
            steps.push({
                action: "click",
                target: destination,
                delay_ms: 2000,
                reason: "选择目的地",
            });
            steps.push({
                action: "click",
                target: "路线",
                delay_ms: 1500,
                reason: "查看路线",
            });
            steps.push({
                action: "done",
                reason: "导航准备完成",
            });
            break;
        }

        case "launch_app": {
            const app = intention.app || "";
            steps.push({
                action: "launch",
                target: app,
                delay_ms: 3000,
                reason: "打开" + app,
            });
            steps.push({
                action: "done",
                reason: "应用已打开",
            });
            break;
        }

        case "system_setting": {
            const target = intention.target || "";
            const action = intention.action || "open";

            steps.push({
                action: "launch",
                target: "设置",
                delay_ms: 2000,
                reason: "打开设置",
            });
            steps.push({
                action: "click",
                target: target,
                delay_ms: 1500,
                reason: "进入" + target + "设置",
            });
            if (action === "close") {
                steps.push({
                    action: "click",
                    target: "关闭",
                    delay_ms: 1000,
                    reason: "关闭" + target,
                });
            } else {
                steps.push({
                    action: "click",
                    target: "开启",
                    delay_ms: 1000,
                    reason: "开启" + target,
                });
            }
            steps.push({
                action: "done",
                reason: "设置完成",
            });
            break;
        }

        case "set_brightness": {
            const level = intention.level || 50;

            steps.push({
                action: "launch",
                target: "设置",
                delay_ms: 2000,
                reason: "打开设置",
            });
            steps.push({
                action: "click",
                target: "显示",
                delay_ms: 1500,
                reason: "进入显示设置",
            });
            steps.push({
                action: "click",
                target: "亮度",
                delay_ms: 1000,
                reason: "选择亮度调节",
            });
            // 实际亮度调节需要滑动，这里交给模型处理具体滑动
            steps.push({
                action: "done",
                reason: "亮度设置准备完成（请在显示页面手动调节到" + level + "%）",
            });
            break;
        }

        case "take_photo": {
            const front = intention.front || false;

            steps.push({
                action: "launch",
                target: "相机",
                delay_ms: 2000,
                reason: "打开相机",
            });
            if (front) {
                steps.push({
                    action: "click",
                    target: "切换摄像头",
                    delay_ms: 1000,
                    reason: "切换到前置摄像头",
                });
            }
            steps.push({
                action: "click",
                target: "拍照",
                delay_ms: 1500,
                reason: "点击拍照",
            });
            steps.push({
                action: "done",
                reason: "拍照完成",
            });
            break;
        }

        case "alipay_paycode": {
            steps.push({
                action: "launch",
                target: "支付宝",
                delay_ms: 3000,
                reason: "打开支付宝",
            });
            steps.push({
                action: "click",
                target: "付钱",
                delay_ms: 2000,
                reason: "打开付款码",
            });
            steps.push({
                action: "done",
                reason: "付款码已打开",
            });
            break;
        }

        case "alipay_scan": {
            steps.push({
                action: "launch",
                target: "支付宝",
                delay_ms: 3000,
                reason: "打开支付宝",
            });
            steps.push({
                action: "click",
                target: "扫一扫",
                delay_ms: 2000,
                reason: "打开扫一扫",
            });
            steps.push({
                action: "done",
                reason: "扫一扫已打开",
            });
            break;
        }

        case "alipay_energy": {
            steps.push({
                action: "launch",
                target: "支付宝",
                delay_ms: 3000,
                reason: "打开支付宝",
            });
            steps.push({
                action: "click",
                target: "蚂蚁森林",
                delay_ms: 2000,
                reason: "进入蚂蚁森林",
            });
            steps.push({
                action: "done",
                reason: "蚂蚁森林已打开",
            });
            break;
        }

        case "go_back": {
            steps.push({
                action: "back",
                delay_ms: 800,
                reason: "返回上一级",
            });
            steps.push({
                action: "done",
                reason: "已返回",
            });
            break;
        }

        case "go_home": {
            steps.push({
                action: "home",
                delay_ms: 800,
                reason: "回到桌面",
            });
            steps.push({
                action: "done",
                reason: "已回到桌面",
            });
            break;
        }

        default:
            // 未知意图，返回空数组，由调用方回退到模型
            break;
    }

    return steps;
}

module.exports = { plan };
