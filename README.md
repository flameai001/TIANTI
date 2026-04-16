# TIANTI Web

TIANTI 是一个面向公开访客的 `cosplay / 国风达人展示 + 活动档案` 站点，同时提供后台工作台，用于维护达人、活动、阵容、档案与编辑人天梯榜。

## 快速开始

1. 复制环境变量模板

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. 安装依赖

   ```powershell
   npm install
   ```

3. 启动开发环境

   ```powershell
   npm run dev
   ```

4. 可选：初始化数据库

   ```powershell
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

当前标准运行时为 `Node 24`，`.nvmrc`、`environment.yml` 与 GitHub Actions 已统一到同一基线。

## 环境模式

- 默认使用 `TIANTI_CONTENT_MODE=mock`，可以直接浏览演示内容并运行测试。
- 接入真实 Postgres 与 R2 后，切换到 `database + r2` 作为标准部署模式。

推荐的真实环境配置：

```env
TIANTI_CONTENT_MODE=database
TIANTI_STORAGE_MODE=r2
DATABASE_URL=postgres://...
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_BASE_URL=...
```

如需覆盖默认编辑账号，可额外设置：

```env
SEED_EDITOR_ONE_EMAIL=
SEED_EDITOR_ONE_PASSWORD=
SEED_EDITOR_TWO_EMAIL=
SEED_EDITOR_TWO_PASSWORD=
```

## 常用命令

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run test:e2e:smoke`
- `npm run test:e2e`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`

## 发布与分支约定

- `main`
  - 只承接可上线版本
  - 对应 Vercel production
- `codex/*`
  - 用于功能开发和联调
  - 对应 Vercel preview
- 其他功能分支
  - 默认只用于预览和 PR 协作

发布时请遵循：

1. 在功能分支完成开发并通过本地验证。
2. 推送分支，确认 Vercel preview 可用。
3. 合并到 `main`。
4. 确认 Vercel production 指向与 `main` 相同的提交。

当前基线收口版本为 `v3.3`，对应功能分支命名使用 `codex/tianti-v3.3`。

## 标准发布检查清单

合并或上线前至少执行：

```powershell
npm run lint
npm test
npm run build
npm run test:e2e:smoke
```

发布前建议再补一轮全量 E2E：

```powershell
npm run test:e2e
```

如果涉及真实存储或部署环境，再额外确认：

- Vercel 项目环境变量齐全
- `main` 对应 production，`codex/*` 对应 preview
- 数据库与 R2 配置已生效
- 后台登录、公开站浏览、活动档案页可正常使用
- Vercel deployment 的 `githubCommitRef` 与目标分支一致

具体步骤见 [发布流程](docs/release-flow.md)。

## 文档

- [V3.3 完成报告](docs/v3.3-completion-report.md)
- [发布流程](docs/release-flow.md)
- [V3.2 完成报告](docs/v3.2-completion-report.md)
- [V3.1 完成报告](docs/v3.1-completion-report.md)
- [V1 完成报告](docs/v1-completion-report.md)
