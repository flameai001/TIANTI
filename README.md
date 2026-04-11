# TIANTI Web

TIANTI 是一个面向公开访客的 cosplay / 国风达人展示与活动信息网站。

## Quick Start

1. 复制环境变量模板：

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. 安装依赖：

   ```powershell
   npm install
   ```

3. 启动开发环境：

   ```powershell
   npm run dev
   ```

4. 可选：初始化数据库

   ```powershell
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

## Modes

- 默认 `TIANTI_CONTENT_MODE=mock`，可以直接看到演示站点内容。
- 接入 Postgres 与 R2 后，可切换到真实存储模式。

## Database Mode

当你准备切到真实持久化时：

1. 在 `.env.local` 中填入 `DATABASE_URL`。
2. 设置：

   ```env
   TIANTI_CONTENT_MODE=database
   TIANTI_STORAGE_MODE=r2
   ```

3. 执行迁移和 seed：

   ```powershell
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. 如需覆盖默认两位编辑账号，可设置：

   ```env
   SEED_EDITOR_ONE_EMAIL=
   SEED_EDITOR_ONE_PASSWORD=
   SEED_EDITOR_TWO_EMAIL=
   SEED_EDITOR_TWO_PASSWORD=
   ```

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`
