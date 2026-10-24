# 赛博阎王殿 · 任务拆解与状态

> 所有 [x] 均有实际实现与可复核测试；[ ] 为明确的后续项，不计入当前 Demo。

- [x] T1 初始化 Vite + React + TS + Tailwind + Monaco + Vitest，配置严格类型检查。
  - 验收：`tsc --noEmit` 通过；Monaco 本地 Worker，无 CDN。
- [x] T2 实现鬼门关：编辑器、文件名、JS/TS 切换、3 个内置案例、字符上限与错误提示。
- [x] T3 实现规则引擎预处理：跨行注释、字符串遮罩、证据行保留。
- [x] T4 实现 6 条规则、严重度排序、去重、60 条截断。
  - 测试：`src/engine/rules.test.ts`（23 项）。
- [x] T5 实现确定性功德分数与三司/阎王判词。
  - 测试：`src/engine/verdict.test.ts`（8 项）。
- [x] T6 实现三屏流程与三司动画（<3s），接入真实 Issue。
- [x] T7 实现生死簿：分数、罪状分组、证据详情、源码定位。
- [x] T8 实现受控补丁：eval JSON 解析与空 catch；Monaco Diff、显式确认、撤销。
  - 测试：`src/engine/patcher.test.ts`（8 项）。
- [x] T9 实现真实静态验证：TypeScript 语法检查 + 对应规则复扫，三态展示。
- [x] T10 视觉与舞台模式、错误边界、离线标识、响应式布局、README 与演示脚本。
- [x] T11 真实执行类型检查、39 项 Vitest、生产构建与浏览器闭环冒烟。
- [ ] T12（P1）可选 AI 代理：服务端密钥、用户同意、Zod 校验、证据回验、超时降级；本次未实现。
- [ ] T13（P2）GitHub 导入与分享卡片；本次未实现。
