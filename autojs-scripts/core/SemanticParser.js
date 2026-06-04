/**
 * 语义解析器
 * 将自然语言转化为结构化意图对象
 */

const APP_ALIASES = {
    "微信": ["微信", "wechat", "weixin"],
    "钉钉": ["钉钉", "dingtalk", "钉"],
    "淘宝": ["淘宝", "taobao", "手机淘宝"],
    "支付宝": ["支付宝", "alipay", "zhifubao"],
    "设置": ["设置", "系统设置", "手机设置"],
    "相机": ["相机", "照相机", "camera"],
    "高德地图": ["高德地图", "高德", "gaode"],
    "百度地图": ["百度地图", "百度", "baidu"],
};

/**
 * 从别名映射表中反查标准应用名
 */
function resolveAppName(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    for (let standard in APP_ALIASES) {
        const aliases = APP_ALIASES[standard];
        for (let i = 0; i < aliases.length; i++) {
            if (aliases[i] === lower || aliases[i] === name) {
                return standard;
            }
        }
    }
    return name;
}

/**
 * 提取联系人姓名
 * 匹配：给张三发...、发给李四...、告诉王五...、跟赵六说...
 */
function extractContactName(text) {
    if (!text) return null;
    const patterns = [
        /给\s*["']?([^"'\s\d]{1,8})["']?\s*(?:发|发送|说|讲|聊|打电话)/,
        /发给\s*["']?([^"'\s\d]{1,8})["']?\s*(?:消息|信息|微信|短信)?/,
        /告诉\s*["']?([^"'\s\d]{1,8})["']?\s*(?:说|讲)/,
        /跟\s*["']?([^"'\s\d]{1,8})["']?\s*(?:说|发|聊)/,
        /向\s*["']?([^"'\s\d]{1,8})["']?\s*(?:发|发送)/,
        /找\s*["']?([^"'\s\d]{1,8})["']?\s*(?:聊|发)/,
    ];
    for (let i = 0; i < patterns.length; i++) {
        const m = text.match(patterns[i]);
        if (m && m[1]) {
            let name = m[1].trim();
            // 过滤掉常见非人名词
            if (name.length > 0 && name.length <= 20) {
                // 如果匹配结果包含了应用名（如"张三发微信"），截断到应用名之前
                for (let app in APP_ALIASES) {
                    const aliases = APP_ALIASES[app];
                    for (let j = 0; j < aliases.length; j++) {
                        const alias = aliases[j];
                        const idx = name.indexOf(alias);
                        if (idx > 0) {
                            name = name.substring(0, idx).trim();
                        }
                    }
                }
                // 去掉末尾残留的动作词（如"张三发" → "张三"）
                const actionSuffixes = ["发", "发送", "说", "讲", "聊", "打"];
                for (let k = 0; k < actionSuffixes.length; k++) {
                    const suffix = actionSuffixes[k];
                    if (name.endsWith(suffix)) {
                        name = name.substring(0, name.length - suffix.length).trim();
                    }
                }
                if (name.length > 0) {
                    return name;
                }
            }
        }
    }
    return null;
}

/**
 * 从文本中提取应用名称
 * 匹配：打开微信、启动钉钉、进入淘宝...
 */
function extractAppName(text) {
    if (!text) return null;
    const patterns = [
        /(?:打开|启动|进入|点开|进)\s*["']?([^"'\s]+?)["']?(?:\s|$|，|。)/,
        /在\s*([^"'\s]+?)\s*(?:里|里面|中|上)?\s*(?:搜|搜索|找|发)/,
        /用\s*([^"'\s]+?)\s*(?:给|发|搜|搜索)/,
    ];
    // 针对"打开XX给XX发..."的特殊处理：提取"打开"和"给"之间的应用名
    const openThenGive = text.match(/(?:打开|启动|进入|点开|进)\s*["']?([^"'\s]+?)["']?\s*(?:给|发给|告诉|跟|向|找)/);
    if (openThenGive && openThenGive[1]) {
        const app = resolveAppName(openThenGive[1].trim());
        if (app) return app;
    }
    for (let i = 0; i < patterns.length; i++) {
        const m = text.match(patterns[i]);
        if (m && m[1]) {
            var matchedApp = resolveAppName(m[1].trim());
            if (matchedApp) return matchedApp;
        }
    }
    return null;
}

/**
 * 提取消息内容
 * 提取引号内或"说"/"发"后面的内容
 */
function extractMessageContent(text) {
    if (!text) return null;
    // 优先匹配引号内容
    const quoteMatch = text.match(/["']([^"']+)["']/);
    if (quoteMatch) {
        return quoteMatch[1];
    }
    // 匹配：给XX发YY、告诉XX说YY、跟XX说YY
    const patterns = [
        /(?:给.+?|发给.+?|告诉.+?|跟.+?)\s*(?:发|发送|说|讲)\s*["']?(.+?)["']?\s*$/,
    ];
    for (let i = 0; i < patterns.length; i++) {
        const m = text.match(patterns[i]);
        if (m && m[1]) {
            const content = m[1].trim();
            if (content.length > 0 && content.length <= 500) {
                return content;
            }
        }
    }
    return null;
}

/**
 * 解析用户自然语言指令
 * 返回：{ intent, app, target, action, details }
 */
function parse(instruction) {
    if (!instruction || typeof instruction !== "string") {
        return { intent: "unknown", raw: instruction };
    }

    const text = instruction.trim();
    const lower = text.toLowerCase();

    // === 1. 发消息 ===
    const contact = extractContactName(text);
    const app = extractAppName(text) || "微信";
    let content = extractMessageContent(text);

    // 清理内容中残留的应用名+动作词前缀（如"微信说晚上吃饭" → "晚上吃饭"）
    if (content && app) {
        const appAliases = APP_ALIASES[app] || [app];
        for (let i = 0; i < appAliases.length; i++) {
            const alias = appAliases[i];
            // 转义正则元字符，防止 alias 中的特殊字符导致异常
            const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 匹配 "微信说..."、"微信发..."、"钉钉说..." 等前缀
            const prefixRe = new RegExp("^" + escapedAlias + "[\\s]*(?:说|讲|发|发送)");
            if (prefixRe.test(content)) {
                content = content.replace(prefixRe, "").trim();
                break;
            }
        }
    }

    if (contact && content) {
        return {
            intent: "send_message",
            app: app,
            target: contact,
            content: content,
            raw: text,
        };
    }

    // 只有联系人，没有明确内容（可能是语音或后续输入）
    if (contact && /(?:给|发给|告诉|跟|向|找).+?(?:发|说|聊|打电话)/.test(text)) {
        return {
            intent: "send_message",
            app: app,
            target: contact,
            content: content || "",
            raw: text,
        };
    }

    // === 2. 打卡 ===
    if (/打卡/.test(text)) {
        const isOut = /下班|退勤|签退/.test(text);
        return {
            intent: "clock_in",
            app: /钉钉/.test(text) ? "钉钉" : (extractAppName(text) || "钉钉"),
            target: isOut ? "下班打卡" : "上班打卡",
            raw: text,
        };
    }

    // === 3. 搜索 ===
    const searchMatch = text.match(/(?:在[^"'\s]+?)?(?:搜|搜索|查找|找)\s*["']?(.+?)["']?\s*$/);
    if (searchMatch) {
        let target = searchMatch[1].trim();
        // 过滤掉开头残留的"索"（当指令是"搜索XX"时，正则可能匹配到"索XX"）
        if (target.charAt(0) === "索" && target.length > 1) {
            target = target.substring(1);
        }
        return {
            intent: "search",
            app: extractAppName(text) || "淘宝",
            target: target,
            raw: text,
        };
    }

    // === 4. 导航 ===
    const navMatch = text.match(/(?:导航到|带我去)\s*["']?(.+?)["']?(?:\s|$|，|。)/);
    if (navMatch) {
        return {
            intent: "navigate",
            app: /百度/.test(text) ? "百度地图" : "高德地图",
            target: navMatch[1].trim(),
            mode: /步行|走路/.test(text) ? "walk" : (/公交|地铁|公共交通/.test(text) ? "bus" : (/骑行|骑车|自行车/.test(text) ? "ride" : "drive")),
            raw: text,
        };
    }
    const navMatch2 = text.match(/^(?:去|到|怎么去)\s*["']?(.+?)["']?(?:\s|$|，|。)/);
    if (navMatch2) {
        let target = navMatch2[1].trim();
        // 过滤掉尾部残留的"怎么走"
        target = target.replace(/怎么走$/, "").trim();
        return {
            intent: "navigate",
            app: /百度/.test(text) ? "百度地图" : "高德地图",
            target: target,
            mode: /步行|走路/.test(text) ? "walk" : (/公交|地铁|公共交通/.test(text) ? "bus" : (/骑行|骑车|自行车/.test(text) ? "ride" : "drive")),
            raw: text,
        };
    }

    // === 5. 设置相关 ===
    if (/打开WiFi|开启WiFi|关闭WiFi|打开蓝牙|关闭蓝牙|打开WLAN|关闭WLAN/.test(text)) {
        const isOn = !/关闭/.test(text);
        const target = /WiFi|WLAN/.test(text) ? "WLAN" : "蓝牙";
        return {
            intent: "system_setting",
            app: "设置",
            target: target,
            action: isOn ? "open" : "close",
            raw: text,
        };
    }

    const brightnessMatch = text.match(/(?:调|设置|把).*(?:亮度|屏幕).*?(\d+)/);
    if (brightnessMatch) {
        return {
            intent: "set_brightness",
            app: "设置",
            target: "亮度",
            level: parseInt(brightnessMatch[1]),
            raw: text,
        };
    }

    // === 6. 打开应用 ===
    const launchMatch = text.match(/(?:打开|启动|进入|点开|进)\s*["']?([^"'\s]+?)["']?(?:\s|$|，|。)/);
    if (launchMatch) {
        return {
            intent: "launch_app",
            app: resolveAppName(launchMatch[1].trim()),
            raw: text,
        };
    }

    // === 7. 拍照 ===
    if (/拍照|照相|拍照片|自拍/.test(text)) {
        return {
            intent: "take_photo",
            app: "相机",
            front: /自拍|前置/.test(text),
            raw: text,
        };
    }

    // === 8. 支付宝相关 ===
    if (/付款码|支付码|收钱码|扫一扫|扫码|收能量|蚂蚁森林/.test(text)) {
        if (/付款码|支付码/.test(text)) {
            return { intent: "alipay_paycode", app: "支付宝", raw: text };
        }
        if (/扫一扫|扫码/.test(text)) {
            return { intent: "alipay_scan", app: "支付宝", raw: text };
        }
        if (/收能量|蚂蚁森林/.test(text)) {
            return { intent: "alipay_energy", app: "支付宝", raw: text };
        }
    }

    // === 9. 返回 / 主页 ===
    if (/返回|回退|上一页/.test(text)) {
        return { intent: "go_back", raw: text };
    }
    if (/回主页|回桌面|回首页|主页/.test(text)) {
        return { intent: "go_home", raw: text };
    }

    // 无法识别
    return {
        intent: "unknown",
        raw: text,
    };
}

module.exports = { parse, extractContactName, extractAppName, extractMessageContent };
