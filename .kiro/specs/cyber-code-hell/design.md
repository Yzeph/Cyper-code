# 赛博阎王殿 · 技术设计

## 技术栈

Vite 7 + React 19 + TypeScript 5.9（strict）+ Tailwind CSS 4 + Monaco Editor（本地打包）+ Lucide + Motion + Vitest。无数据库、无 Docker、无微服务、无运行时后端。Zod 预留给未来 AI 外部数据校验。

## 目录与职责

```text
src/domain/types.ts      Issue / Judgment / Patch / VerificationResult / DemoCase
src/engine/rules.ts      源码预处理（去注释、字符串遮罩）+ 6 条纯函数规则 + 排序去重
src/engine/score.ts      确定性功德扣分
src/engine/verdict.ts    三司分组、判词、Judgment 组装
src/engine/patcher.ts    eval JSON 解析、空 catch 两个受控补丁模板
src/engine/verify.ts     TypeScript 语法检查 + 对应规则复扫
src/data/demoCases.ts    3 个内置卷宗
src/components/*         GatePage / ThreeJudgesPage / VerdictBook / ResurrectionPanel / CodeEditor
src/App.tsx              轻量状态机与流程编排
```

## 核心接口

```ts
interface Issue {
  id: string; judge: 'black'|'white'|'judge'; ruleId: string; crime: string;
  title: string; severity: 'critical'|'high'|'medium'|'low';
  file: string; line: number; evidence: string; explanation: string;
  suggestion: string; confidence: 'confirmed'|'suspected';
  source: 'rule'|'ai';
}

interface Judgment {
  issues: Issue[]; score: number; severityCounts: Record<Severity, number>;
  judges: Record<JudgeType, JudgeSummary>;
  yamaVerdict: string; engineVersion: string; scannedLines: number;
}

interface Patch { before: string; after: string; startLine: number; endLine: number; rationale: string; }

interface VerificationResult {
  syntax: 'pass'|'fail'|'not-run';
  rules: 'pass'|'fail'|'not-run';
  unitTests: 'not-run';
  passed: boolean;
  remaining: Issue[];
}
```

## 数据流

`source` → `prepareSource`（逐行去注释、遮罩字符串）→ 6 条规则 → `Issue[]` → 排序/去重/截断 → `judgeCode` → `Judgment` → 三司页面与生死簿。  
还阳：`generatePatch(issue)` → Monaco Diff → 用户确认 → `verifyPatch` → 静态语法 + 规则复扫 → 更新源码与判决；撤销恢复 `patch.before`。

## 状态机

`gate`（编辑/选卷宗）→ 点击押送 → `judging`（三司动画 1.65s）→ `verdict`（判决/定位/还阳）→ 可回 `gate` 定位源码，或打开还阳浮层。还阳浮层独立于页面状态，关闭后回到 `verdict`。

## 规则设计

| ruleId | 判官 | 检测要点 | 误报控制 |
|---|---|---|---|
| eval-execution | 黑无常 | 遮罩字符串后匹配 `eval(` | 注释与字符串不触发 |
| hardcoded-credential | 黑无常 | 敏感名 + 字符串赋值（≥4 字符） | 环境变量读取不触发 |
| sql-string-concat | 黑无常 | SQL 关键字 + 拼接/模板插值 + db/query 上下文 | 静态 SQL 不触发 |
| empty-catch | 地府判官 | 花括号内无语句 | 注释-only 视为有意忽略 |
| nested-loop | 白无常 | 花括号循环内再遇循环 | 仅提醒，低危 |
| console-output | 地府判官 | `console.log/debug/info/trace(` | 低危，不升级为漏洞 |

## 验证策略

- 语法：`ts.transpileModule({ reportDiagnostics: true })` 过滤 Error 级诊断。
- 规则复扫：只比较同一 `ruleId` 是否仍命中，避免无关规则干扰。
- 单元测试：永远 `not-run`，不执行陌生代码。
- 通过条件：语法与规则均为 pass；UI 文案严格限定为“本次修复验证通过”。

## 错误处理与隐私

空输入、超长输入、引擎异常、渲染异常均有兜底；错误边界不执行代码。Monaco 与 Worker 本地打包；无网络请求；不读取环境密钥。AI（P1）未接入，未来必须服务端持钥、用户显式同意、Zod 校验、证据回验与超时降级。

## 性能与视觉

代码分割 Monaco/Motion/React；三司动画总时长 <3s；支持 `prefers-reduced-motion`；舞台模式隐藏次要信息并放大标题；1366×768 与 1920×1080 允许纵向滚动但关键操作始终可见。
