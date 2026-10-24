# Tech Steering

- TypeScript strict；规则引擎、评分、补丁、验证均为可测试纯函数。
- 组件职责单一；页面状态集中在 App，避免引入不必要状态库。
- Monaco 与 Worker 本地打包，禁止 CDN 依赖，保证离线。
- 不执行用户提交的代码；语法验证只用 TypeScript 解析器。
- 不引入数据库、Docker、微服务；前端构建即为交付物。
- 外部 JSON 必须用 Zod 校验（为未来 AI 预留）；AI 密钥只能在服务端。
- 每次改动先运行 `tsc --noEmit` 与 `vitest run`，失败先修复再继续。
