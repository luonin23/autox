/**
 * Fold7 Agent — 用户配置文件
 *
 * 使用方法：
 * 1. 复制本文件为 config.js
 * 2. 填入你的 API Key 和其他配置
 * 3. config.js 不会被提交到 Git（已加入 .gitignore）
 */
module.exports = {
    // 模型提供商：可选 "kimi" | "deepseek" | "local"
    provider: "kimi",

    // API 格式："openai"（默认）或 "anthropic"
    format: "anthropic",

    // Kimi (Moonshot) API 配置
    kimi: {
        baseUrl: "https://api.kimi.com/coding",
        apiKey: "",      // <-- 填入你的 API Key
        model: "kimi-for-coding",
    },

    // DeepSeek API 配置
    deepseek: {
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",      // <-- 填入你的 DeepSeek API Key
        model: "deepseek-chat",
    },

    // 本地 llama.cpp server 配置
    local: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "",
        model: "local",
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
