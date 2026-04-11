# TIANTI 本地搭建

## 1. 基础环境

- Node.js 24
- npm 11+
- 可选 Conda：`conda env create -f environment.yml`

## 2. 环境变量

复制 `.env.example` 为 `.env.local`，至少补齐：

- `SESSION_SECRET`
- 数据库模式下的 `DATABASE_URL`
- R2 模式下的 R2 配置

## 3. 内容模式

### 演示模式

```env
TIANTI_CONTENT_MODE=mock
TIANTI_STORAGE_MODE=mock
```

适合先看公开站、后台流程与 UI。

### 数据库模式

```env
TIANTI_CONTENT_MODE=database
TIANTI_STORAGE_MODE=r2
```

然后执行：

```powershell
npm run db:generate
npm run db:push
npm run db:seed
```

如果想覆盖默认演示编辑账号，可额外设置：

```env
SEED_EDITOR_ONE_EMAIL=
SEED_EDITOR_ONE_PASSWORD=
SEED_EDITOR_TWO_EMAIL=
SEED_EDITOR_TWO_PASSWORD=
```

`db:seed` 会根据这些环境变量重新生成两位编辑的密码哈希。

## 4. 首次上线建议

1. 在 Vercel 创建项目并配置环境变量。
2. 先以 `mock` 内容模式完成 UI 与公开站验证。
3. 接入 Postgres 和 R2 后再切到 `database` / `r2` 模式。
4. 先确认后台登录、达人编辑、活动编辑和活动档案录入都通过，再替换成真实内容。
