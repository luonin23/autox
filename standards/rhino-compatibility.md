# Rhino JavaScript 兼容性规范

AutoX.js 使用 Mozilla Rhino JavaScript 引擎，与 Node.js/V8 有显著差异。本规范是编写可运行于 AutoX.js 的代码的强制性标准。

## 核心限制

### 1. 变量声明

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| `const` | ⚠️ 同一函数作用域内不可重复声明（包括 switch case 之间） | 优先使用 `var` |
| `let` | ⚠️ 同 const，有块级作用域但 Rhino 实现不稳定 | 优先使用 `var` |
| `var` | ✅ 完全支持 | **推荐** |

**禁止示例：**
```javascript
switch (x) {
    case 1: const app = "a"; break;  // ❌
    case 2: const app = "b"; break;  // ❌ 报错：重复声明
}
```

**正确写法：**
```javascript
switch (x) {
    case 1: var app1 = "a"; break;  // ✅
    case 2: var app2 = "b"; break;  // ✅
}
```

### 2. 函数语法

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| 箭头函数 `() => {}` | ❌ 不支持 | `function() {}` |
| 函数默认参数 `function(a=1)` | ❌ 不支持 | 函数内手动判断 |
| 剩余参数 `function(...args)` | ❌ 不支持 | 使用 `arguments` |

### 3. 字符串

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| 模板字符串 `` `hello ${name}` `` | ❌ 不支持 | 字符串拼接 `"hello " + name` |
| 多行字符串 `` `line1\nline2` `` | ❌ 不支持 | 使用 `+` 拼接或 `\n` 转义 |

### 4. 对象与解构

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| 解构赋值 `const {a, b} = obj` | ❌ 不支持 | 手动提取 `var a = obj.a` |
| 对象简写 `{a, b}` | ⚠️ 部分支持 | 明确写 `{a: a, b: b}` |
| 计算属性名 `{[key]: val}` | ❌ 不支持 | 先创建对象再赋值 |

### 5. 异步编程

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| `Promise` | ❌ 不支持 | 回调函数 |
| `async/await` | ❌ 不支持 | 回调函数 |
| `setTimeout`/`setInterval` | ✅ 支持 | - |

### 6. 类与模块

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| `class` 语法 | ❌ 不支持 | 构造函数 + prototype |
| `import`/`export` | ❌ 不支持 | `module.exports` / `require()` |
| `Symbol` | ❌ 不支持 | 字符串键 |

### 7. 数组方法

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| `Array.prototype.includes` | ❌ 不支持 | `indexOf >= 0` |
| `Array.prototype.find` | ⚠️ 部分支持 | `for` 循环 |
| `Array.prototype.findIndex` | ⚠️ 部分支持 | `for` 循环 |
| `Array.from` | ❌ 不支持 | 手动创建 |
| `Array.of` | ❌ 不支持 | 手动创建 |

### 8. 其他

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| `Object.assign` | ⚠️ 部分支持 | 手动拷贝属性 |
| `Object.keys` | ✅ 支持 | - |
| `JSON.parse` / `JSON.stringify` | ✅ 支持 | - |
| `Map` / `Set` | ❌ 不支持 | 普通对象/数组 |
| `Proxy` | ❌ 不支持 | 直接操作对象 |
| 正则表达式 lookahead | ⚠️ 部分支持 | 避免使用 |

## 推荐编码风格

```javascript
// ✅ 推荐写法
"ui";

(function() {
    var UIAutomator = require('./core/UIAutomator.js');
    var StopHelper = require('./core/StopHelper.js');
    var Logger = require('./core/Logger.js');

    function main() {
        StopHelper.setup();
        Logger.taskStart('script', '任务描述', null);

        try {
            var steps = [
                { action: 'launch', target: '微信', delay_ms: 3000, reason: '打开微信' },
                { action: 'click', target: '通讯录', delay_ms: 2000, reason: '进入通讯录' },
            ];

            for (var i = 0; i < steps.length; i++) {
                if (StopHelper.check()) break;
                var step = steps[i];
                UIAutomator.executeCommand(step);
            }

            Logger.taskEnd('script', true, '完成', steps.length);
        } catch (e) {
            Logger.errorLog(e.message, null);
            log('❌ 错误: ' + e.message);
        } finally {
            StopHelper.teardown();
        }
    }

    main();
})();
```

## 调试技巧

1. 遇到 `SyntaxError`：检查是否使用了 ES6+ 语法
2. 遇到 `ReferenceError`：检查变量声明是否使用了 `const`/`let` 且重复声明
3. 遇到 `TypeError`：检查对象方法是否存在（如 `includes`）
4. 使用 `log()` 输出调试信息，AutoX.js 日志界面可查看
