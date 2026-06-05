/**
 * AppConfig — runtime configuration for the Fold7 app shell.
 *
 * Config is persisted on the phone so Settings changes immediately affect
 * ModelClient without putting API keys into generated scripts.
 */

var AppConfig = (function () {
    var CONFIG_PATH = "/sdcard/AutoX/fold7-agent/autojs-scripts/config.js";

    function defaults() {
        return {
            provider: "kimi",
            format: "anthropic",
            kimi: {
                baseUrl: "https://api.kimi.com/coding",
                apiKey: "",
                model: "kimi-for-coding",
            },
            deepseek: {
                baseUrl: "https://api.deepseek.com/v1",
                apiKey: "",
                model: "deepseek-chat",
            },
            local: {
                baseUrl: "http://127.0.0.1:8080/v1",
                apiKey: "",
                model: "local",
            },
            maxSteps: 15,
            delay: {
                min: 500,
                max: 2000,
                wechatMin: 3000,
            },
        };
    }

    function merge(base, override) {
        var result = {};
        var key;
        for (key in base) {
            if (base.hasOwnProperty(key)) {
                if (base[key] && typeof base[key] === "object" && !(base[key] instanceof Array)) {
                    result[key] = merge(base[key], {});
                } else {
                    result[key] = base[key];
                }
            }
        }
        override = override || {};
        for (key in override) {
            if (override.hasOwnProperty(key)) {
                if (override[key] && typeof override[key] === "object" && !(override[key] instanceof Array) && result[key]) {
                    result[key] = merge(result[key], override[key]);
                } else {
                    result[key] = override[key];
                }
            }
        }
        return result;
    }

    function read() {
        var cfg = null;
        try {
            cfg = require("../config.js");
        } catch (e1) {
            try {
                cfg = require(CONFIG_PATH);
            } catch (e2) {
                cfg = null;
            }
        }
        return merge(defaults(), cfg || {});
    }

    function serialize(cfg) {
        return "module.exports = " + JSON.stringify(cfg, null, 4) + ";\n";
    }

    function write(cfg) {
        files.createWithDirs(CONFIG_PATH);
        files.write(CONFIG_PATH, serialize(merge(defaults(), cfg || {})));
    }

    function isConfigured(cfg) {
        cfg = cfg || read();
        var provider = cfg.provider || "kimi";
        var providerCfg = cfg[provider] || {};
        if (provider === "local") {
            return !!(providerCfg.baseUrl && providerCfg.model);
        }
        return !!(providerCfg.apiKey && providerCfg.apiKey.length >= 10);
    }

    function providerLabel(provider) {
        if (provider === "deepseek") return "DeepSeek";
        if (provider === "local") return "本地";
        return "Kimi";
    }

    return {
        path: CONFIG_PATH,
        defaults: defaults,
        read: read,
        write: write,
        isConfigured: isConfigured,
        providerLabel: providerLabel,
    };
})();

module.exports = AppConfig;
