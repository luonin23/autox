/**
 * AutoX.js API Mock — 用于在 Node.js 环境测试脚本逻辑
 *
 * 用法:
 *   node -r ./test/mock.js ./main.js
 *   node ./test/runner.js
 *
 * 特性:
 * - 屏幕状态机: 可设置当前"页面"，findOne 返回对应节点
 * - 模型响应配置: 可注入不同场景的模型返回
 * - 测试断言: 内置 assert 辅助
 */

if (typeof global.device === "undefined") {
    // === 内部状态 ===
    const _state = {
        page: "home",           // 当前页面: home, wechat_home, chat, settings, taobao_home...
        nodes: {},              // 页面节点表
        modelResponses: [],     // 模型响应队列
        modelResponseIndex: 0,
        logs: [],               // 捕获的日志
        actions: [],            // 记录的操作序列
    };

    global._mockState = _state;

    // === 页面节点配置 ===
    const PAGE_NODES = {
        home: [
            { text: "微信", desc: "微信", clickable: true },
            { text: "钉钉", desc: "钉钉", clickable: true },
            { text: "设置", desc: "设置", clickable: true },
            { text: "相机", desc: "相机", clickable: true },
            { text: "手机淘宝", desc: "手机淘宝", clickable: true },
        ],
        wechat_home: [
            { text: "微信", desc: "微信顶部" },
            { text: "通讯录", desc: "通讯录", clickable: true },
            { text: "发现", desc: "发现", clickable: true },
            { text: "我", desc: "我", clickable: true },
            { text: "搜索", desc: "搜索", clickable: true },
        ],
        wechat_search: [
            { text: "搜索", desc: "搜索输入框", clickable: true, className: "EditText" },
            { text: "取消", desc: "取消", clickable: true },
        ],
        chat: [
            { text: "发消息", desc: "发消息输入框", clickable: true, className: "EditText" },
            { text: "发送", desc: "发送", clickable: true },
            { text: "返回", desc: "返回", clickable: true },
        ],
        settings: [
            { text: "WLAN", desc: "WLAN", clickable: true },
            { text: "蓝牙", desc: "蓝牙", clickable: true },
            { text: "显示", desc: "显示", clickable: true },
            { text: "声音", desc: "声音", clickable: true },
        ],
        taobao_home: [
            { text: "搜索宝贝", desc: "搜索宝贝", clickable: true },
            { text: "关闭", desc: "关闭弹窗", clickable: true },
        ],
        taobao_search: [
            { text: "搜索", desc: "搜索", clickable: true },
            { text: "综合", desc: "综合排序", clickable: true },
            { text: "销量", desc: "销量排序", clickable: true },
            { text: "价格", desc: "价格排序", clickable: true },
        ],
        dingtalk_workbench: [
            { text: "工作台", desc: "工作台", clickable: true },
            { text: "消息", desc: "消息", clickable: true },
        ],
        dingtalk_attendance: [
            { text: "考勤打卡", desc: "考勤打卡", clickable: true },
            { text: "上班打卡", desc: "上班打卡", clickable: true },
            { text: "下班打卡", desc: "下班打卡", clickable: true },
        ],
        camera: [
            { text: "拍照", desc: "快门", clickable: true },
            { text: "切换摄像头", desc: "切换摄像头", clickable: true },
        ],
    };

    // === 日志 ===
    global.log = function () {
        const msg = Array.prototype.slice.call(arguments).join(" ");
        _state.logs.push("[LOG] " + msg);
        console.log("[LOG]", ...arguments);
    };
    global.toast = function (msg) {
        _state.logs.push("[TOAST] " + msg);
        console.log("[TOAST]", msg);
    };
    global.toastLog = function (msg) {
        _state.logs.push("[TOAST+LOG] " + msg);
        console.log("[TOAST+LOG]", msg);
    };

    // === 设备信息 ===
    global.device = {
        width: 1080,
        height: 2400,
        lockScreen: () => console.log("[MOCK] lockScreen"),
        setBrightness: (v) => console.log("[MOCK] setBrightness", v),
        setBrightnessMode: (m) => console.log("[MOCK] setBrightnessMode", m),
    };

    // === 基础操作 ===
    global.sleep = function (ms) {
        // 非阻塞模拟，仅记录
        console.log("[MOCK] sleep(" + ms + ")");
    };
    global.random = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    global.click = function (x, y) {
        _state.actions.push({ type: "click", x, y });
        console.log("[MOCK] click(" + x + ", " + y + ")");
        return true;
    };
    global.swipe = function (x1, y1, x2, y2, duration) {
        _state.actions.push({ type: "swipe", x1, y1, x2, y2, duration });
        console.log("[MOCK] swipe(" + [x1, y1, x2, y2, duration].join(", ") + ")");
        return true;
    };
    global.press = function (x, y, duration) {
        _state.actions.push({ type: "press", x, y, duration });
        console.log("[MOCK] press(" + x + ", " + y + ", " + duration + ")");
        return true;
    };
    global.back = function () {
        _state.actions.push({ type: "back" });
        _state.page = "home"; // 简化：返回即回到桌面
        console.log("[MOCK] back() -> page=home");
    };
    global.home = function () {
        _state.actions.push({ type: "home" });
        _state.page = "home";
        console.log("[MOCK] home() -> page=home");
    };
    global.launchApp = function (appName) {
        _state.actions.push({ type: "launch", app: appName });
        // 根据应用名切换页面
        const pageMap = {
            "微信": "wechat_home",
            "钉钉": "dingtalk_workbench",
            "设置": "settings",
            "相机": "camera",
            "手机淘宝": "taobao_home",
        };
        if (pageMap[appName]) {
            _state.page = pageMap[appName];
        }
        console.log("[MOCK] launchApp('" + appName + "') -> page=" + _state.page);
    };
    global.rawInput = function (title, defaultText) {
        console.log("[MOCK] rawInput('" + title + "', '" + defaultText + "')");
        return defaultText;
    };
    global.KeyCode = function (code) {
        _state.actions.push({ type: "keycode", code });
        console.log("[MOCK] KeyCode(" + code + ")");
    };

    // === HTTP ===
    global.http = {
        postJson: function (url, payload, options) {
            _state.actions.push({ type: "http_post", url });
            console.log("[MOCK] POST", url);
            console.log("[MOCK] model:", payload.model);

            // 从响应队列中取，没有则返回默认 done
            let responseText = '{"action":"done","reason":"mock完成"}';
            if (_state.modelResponses.length > 0) {
                const idx = _state.modelResponseIndex % _state.modelResponses.length;
                responseText = JSON.stringify(_state.modelResponses[idx]);
                _state.modelResponseIndex++;
            }

            // 如果 userContent 中包含特定指令，返回对应 action
            const userContent = payload.messages ? payload.messages[payload.messages.length - 1].content : "";
            if (userContent.indexOf("打开微信") >= 0 && _state.modelResponses.length === 0) {
                responseText = '{"action":"launch","target":"微信","delay_ms":2000,"reason":"打开微信"}';
            } else if (userContent.indexOf("打开设置") >= 0 && _state.modelResponses.length === 0) {
                responseText = '{"action":"launch","target":"设置","delay_ms":2000,"reason":"打开设置"}';
            } else if (userContent.indexOf("点击") >= 0 && _state.modelResponses.length === 0) {
                const targetMatch = userContent.match(/点击[\"']?(.+?)[\"']?/);
                const target = targetMatch ? targetMatch[1] : "未知";
                responseText = JSON.stringify({ action: "click", target: target, delay_ms: 1000, reason: "点击" + target });
            }

            console.log("[MOCK] response:", responseText);

            return {
                statusCode: 200,
                body: {
                    string: () => '{"choices":[{"message":{"content":' + JSON.stringify(responseText) + '}}]}',
                    json: () => ({
                        choices: [{
                            message: { content: responseText },
                        }],
                    }),
                },
            };
        },
    };

    // === UI 选择器 Mock ===
    function MockNode(data) {
        this._text = data.text || "";
        this._desc = data.desc || "";
        this._className = data.className || "";
        this._clickable = data.clickable === true;
    }
    MockNode.prototype.text = function () { return this._text; };
    MockNode.prototype.desc = function () { return this._desc; };
    MockNode.prototype.clickable = function () { return this._clickable; };
    MockNode.prototype.click = function () {
        _state.actions.push({ type: "node_click", text: this._text, desc: this._desc });
        console.log("[MOCK] click node: text='" + this._text + "' desc='" + this._desc + "'");
        // 点击搜索框后进入搜索页面
        if (this._text === "搜索" || this._desc === "搜索宝贝") {
            const pageMap = {
                "wechat_home": "wechat_search",
                "taobao_home": "taobao_search",
            };
            _state.page = pageMap[_state.page] || _state.page + "_search";
            console.log("[MOCK] -> page=" + _state.page);
        }
        return true;
    };
    MockNode.prototype.setText = function (t) {
        _state.actions.push({ type: "node_setText", text: this._text, value: t });
        console.log("[MOCK] setText('" + t + "') on node text='" + this._text + "'");
    };
    MockNode.prototype.bounds = function () {
        return {
            centerX: () => 540,
            centerY: () => 1200,
        };
    };
    MockNode.prototype.longClick = function () {
        console.log("[MOCK] longClick node: text='" + this._text + "'");
        return true;
    };

    function Selector(filter) {
        this.filter = filter;
    }
    Selector.prototype.findOne = function (timeout) {
        console.log("[MOCK] findOne(" + timeout + ") filter:", JSON.stringify(this.filter));
        const pageNodes = PAGE_NODES[_state.page] || PAGE_NODES["home"] || [];
        for (let i = 0; i < pageNodes.length; i++) {
            const n = pageNodes[i];
            if (this.filter.text && n.text === this.filter.text) return new MockNode(n);
            if (this.filter.desc && n.desc === this.filter.desc) return new MockNode(n);
            if (this.filter.textContains && n.text && n.text.indexOf(this.filter.textContains) >= 0) return new MockNode(n);
            if (this.filter.descContains && n.desc && n.desc.indexOf(this.filter.descContains) >= 0) return new MockNode(n);
            if (this.filter.className && n.className === this.filter.className) return new MockNode(n);
            if (this.filter.textStartsWith && n.text && n.text.indexOf(this.filter.textStartsWith) === 0) return new MockNode(n);
        }
        // 通配符匹配
        if (this.filter.classNameContains === "") {
            return new MockNode(pageNodes[0] || { text: "模拟节点", clickable: true });
        }
        return null;
    };
    Selector.prototype.find = function () {
        const pageNodes = PAGE_NODES[_state.page] || [];
        return pageNodes.map(n => new MockNode(n));
    };
    Selector.prototype.exists = function () {
        const pageNodes = PAGE_NODES[_state.page] || [];
        for (let i = 0; i < pageNodes.length; i++) {
            const n = pageNodes[i];
            if (this.filter.text && n.text === this.filter.text) return true;
            if (this.filter.desc && n.desc === this.filter.desc) return true;
            if (this.filter.textContains && n.text && n.text.indexOf(this.filter.textContains) >= 0) return true;
        }
        return false;
    };

    global.text = function (t) { return new Selector({ text: t }); };
    global.desc = function (d) { return new Selector({ desc: d }); };
    global.textContains = function (t) { return new Selector({ textContains: t }); };
    global.descContains = function (d) { return new Selector({ descContains: d }); };
    global.className = function (c) { return new Selector({ className: c }); };
    global.classNameContains = function (c) { return new Selector({ classNameContains: c }); };
    global.textStartsWith = function (t) { return new Selector({ textStartsWith: t }); };

    // === 文件与截图 ===
    global.files = {
        createWithDirs: function (path) {
            console.log("[MOCK] createWithDirs('" + path + "')");
        },
        append: function (path, content) {
            console.log("[MOCK] append('" + path + "', '" + content.substring(0, 50) + "...')");
        },
        exists: function (path) {
            return false;
        },
        read: function (path) {
            return "";
        },
    };
    global.captureScreen = function (path) {
        console.log("[MOCK] captureScreen('" + (path || "") + "')");
    };
    global.gesture = function () {
        const args = Array.prototype.slice.call(arguments);
        console.log("[MOCK] gesture", args.slice(0, 5).join(", "), "...");
    };

    // === App 启动 ===
    global.app = {
        startActivity: function (opts) {
            console.log("[MOCK] startActivity", JSON.stringify(opts));
        },
    };

    // === UI 模块 Mock ===
    global.ui = {
        layout: function (xml) {
            console.log("[MOCK] ui.layout(...)");
        },
        statusBarColor: function (color) {
            console.log("[MOCK] ui.statusBarColor(" + color + ")");
        },
        finish: function () {
            console.log("[MOCK] ui.finish()");
        },
        // 动态属性访问
        __props: {},
    };
    // 代理 ui.xxx 访问
    const uiHandler = {
        get: function (target, prop) {
            if (prop in target) return target[prop];
            if (prop === "__props") return target.__props;
            // 返回一个模拟的 UI 控件对象
            if (!target.__props[prop]) {
                target.__props[prop] = {
                    getText: () => "",
                    setText: (t) => console.log("[MOCK] " + prop + ".setText(" + t + ")"),
                    getSelectedItemPosition: () => 0,
                    setSelection: (i) => console.log("[MOCK] " + prop + ".setSelection(" + i + ")"),
                    click: function (fn) {
                        if (fn) fn();
                    },
                    setText: function (t) {
                        console.log("[MOCK] " + prop + ".setText(" + t + ")");
                    },
                };
            }
            return target.__props[prop];
        },
    };
    global.ui = new Proxy(global.ui, uiHandler);

    // === Mock 环境标志 ===
    global._MOCK_SKIP_VALIDATION = true;

    // === 测试辅助 ===
    global._mockAssert = {
        pageIs: function (expected) {
            const actual = _state.page;
            if (actual !== expected) {
                throw new Error("断言失败: 期望页面 '" + expected + "'，实际 '" + actual + "'");
            }
            console.log("✅ 页面正确:", expected);
        },
        actionContains: function (type, details) {
            const found = _state.actions.some(a => {
                if (a.type !== type) return false;
                if (!details) return true;
                for (let k in details) {
                    if (a[k] !== details[k]) return false;
                }
                return true;
            });
            if (!found) {
                throw new Error("断言失败: 未找到操作 '" + type + "' " + JSON.stringify(details));
            }
            console.log("✅ 操作存在:", type, JSON.stringify(details));
        },
        actionsCount: function (min) {
            if (_state.actions.length < min) {
                throw new Error("断言失败: 操作数 " + _state.actions.length + " < " + min);
            }
            console.log("✅ 操作数满足:", _state.actions.length, ">=", min);
        },
        reset: function () {
            _state.page = "home";
            _state.actions = [];
            _state.logs = [];
            _state.modelResponses = [];
            _state.modelResponseIndex = 0;
            console.log("🔄 Mock 状态已重置");
        },
        setPage: function (page) {
            _state.page = page;
            console.log("🔄 设置页面:", page);
        },
        setModelResponses: function (responses) {
            _state.modelResponses = responses;
            _state.modelResponseIndex = 0;
            console.log("🔄 设置模型响应队列, 长度:", responses.length);
        },
        dumpActions: function () {
            console.log("📋 操作序列:");
            _state.actions.forEach((a, i) => console.log("  " + (i + 1) + ".", JSON.stringify(a)));
        },
    };

    console.log("=== AutoX.js Mock 环境已加载 ===\n");
}
