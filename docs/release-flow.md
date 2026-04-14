# TIANTI 发布流程

## 目标

保证 GitHub 分支、Vercel preview、Vercel production 三者始终保持清晰的一一对应关系，避免“代码已改但生产没跟上”。

## 分支与部署映射

- `main`
  - 唯一生产分支
  - 应始终驱动 Vercel production
- `codex/*`
  - 默认开发分支
  - 推送后生成 Vercel preview
- 其他功能分支
  - 也只用于 preview，不直接代表生产

## 日常开发流程

1. 从最新 `main` 或指定基线分支切出 `codex/*` 分支。
2. 在本地完成开发、验证和必要文档更新。
3. 推送当前分支，检查 Vercel preview。
4. 通过后合并到 `main`。
5. 确认 production 已更新到与 `main` 相同的提交。

## 本地验证

每次准备推送或合并前，至少运行：

```powershell
npm run lint
npm test
npm run build
```

如果改动影响后台工作流，建议再补一轮：

```powershell
npm run test:e2e
```

## 上线检查清单

- GitHub 上目标提交已进入 `main`
- `.github/workflows/ci.yml` 通过
- Vercel preview 对应本次功能分支并验证通过
- Vercel production 指向 `main` 的最新提交
- 后台登录可用
- `/admin/archives`、`/admin/talents`、`/admin/ladder` 可正常访问
- 公开站 `/events`、`/talents`、`/ladder` 可正常浏览

## 回滚思路

如果 preview 正常但 production 异常：

1. 先确认 production 当前部署对应的 Git 提交。
2. 对比 `main` 最近一次变更范围。
3. 必要时在 GitHub 上回滚 `main`，再让 production 跟随回滚后的提交。

不建议直接在 Vercel 上做“脱离 Git 的临时热修复”，否则会让 GitHub、preview、production 状态失配。
