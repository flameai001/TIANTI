# TIANTI 发布流程

本文档以 `v3.3` 基线为准，目标是把仓库分支、GitHub 提交和 Vercel deployment 的关系固定到一套可复核流程里。

## 1. 版本与分支约定

- `main`
  - 只承接可上线版本
  - 对应 Vercel production
- `codex/*`
  - 用于功能开发和联调
  - 对应 Vercel preview
- 当前基线收口版本使用 `codex/tianti-v3.3`

## 2. 本地基线

- 标准运行时：`Node 24`
- 真相来源：
  - `.nvmrc`
  - `environment.yml`
  - `.github/workflows/ci.yml`
- Vercel linkage 真相来源：
  - `.vercel/project.json`

## 3. 合并前检查

至少执行：

```powershell
npm run lint
npm test
npm run build
npm run test:e2e:smoke
```

发布前建议再补一轮：

```powershell
npm run test:e2e
```

如果本轮涉及真实环境接线，再确认：

- `DATABASE_URL`、R2 相关环境变量已在 Vercel 配齐
- preview / production 使用的环境目标正确
- 后台登录、公开页浏览、活动详情页可正常访问

## 4. Preview 核验

1. 推送功能分支到 GitHub，例如 `codex/tianti-v3.3`
2. 确认远端分支存在：

   ```powershell
   git ls-remote --heads origin codex/tianti-v3.3
   ```

3. 查询该分支对应的 preview deployment：

   ```powershell
   vercel list skill-deploy-mf0nplcd7f -m githubCommitRef=codex/tianti-v3.3 --format json
   ```

4. 重点核对以下字段：
   - `meta.githubCommitRef = codex/tianti-v3.3`
   - `meta.githubCommitSha` 与分支 head 一致
   - `state = READY`
   - `target = null`，表示 preview

5. 如需查看部署详情：

   ```powershell
   vercel inspect <preview-url>
   ```

## 5. Production 核验

1. 合并到 `main`
2. 先确认 Git 侧提交一致：

   ```powershell
   git rev-parse main origin/main
   ```

3. 查询 production deployment：

   ```powershell
   vercel list skill-deploy-mf0nplcd7f --environment production --format json
   vercel inspect https://skill-deploy-mf0nplcd7f.vercel.app
   ```

4. 重点核对以下字段：
   - `meta.githubCommitRef = main`
   - `meta.githubCommitSha` 与 `main` head 一致
   - `state = READY`
   - 正式域名 `https://skill-deploy-mf0nplcd7f.vercel.app` 可正常回读

## 6. 记录要求

每个正式版本完成后，都应在对应完成报告里记录：

- 本地分支与远端分支状态
- 当前 `main` 对应 commit
- 最新 production deployment URL、部署时间与 commit
- 最新 preview deployment URL、对应分支与 commit
- 若 preview 尚未形成，也必须明确写出原因，例如“功能分支尚未 push，因此 Vercel 尚未生成对应 preview”
