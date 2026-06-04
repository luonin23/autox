/**
 * Fold7 Agent — 用户配置文件
 *
 * 使用方法：
 * 1. 复制本文件为 config.js
 * 2. 填入你的 API Key 和其他配置
 * 3. config.js 不会被提交到 Git（已加入 .gitignore）
 */
module.exports = {
    // 模型提供商: "kimi" | "local"
    provider: "kimi",

    // Kimi (Moonshot) API 配置
    kimi: {
        apiKey: "", // <-- 填入你的 Moonshot API Key
        model: "kimi-k2-6",
        url: "https://api.moonshot.cn/v1/chat/completions",
    },

    // 本地 llama.cpp server 配置
    // llama.cpp 启动时加 --api-key 可设密钥，否则留空
    local: {
        apiKey: "",
        model: "local",
        // Termux 真机用 127.0.0.1，模拟器用 10.0.2.2
        url: "http://127.0.0.1:8080/v1/chat/completions",
    },

    // 智能任务执行参数
    maxSteps: 15,

    // 反检测延迟（毫秒）
    delay: {
        min: 500,
        max: 2000,
        wechatMin: 3000, // 微信操作最小间隔
    },
};
