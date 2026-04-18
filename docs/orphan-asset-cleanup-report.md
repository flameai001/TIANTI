# TIANTI 孤儿素材定时清理实现报告

- 项目名称：TIANTI Web
- 报告日期：`2026-04-18`
- 当前代码基线：`76fcf29 fix 3:4`
- 当前正式分支：`main`

## 1. 背景与目标

本次改动的目标，是为 TIANTI 当前的 `R2` 图片上传链路补齐“孤儿素材自动清理”能力。

在改动前，项目已经具备一部分素材回收能力：

- 当达人封面、代表图、现场图、合照等素材在保存流程中被替换或解绑时，系统会重新计算引用关系，并尝试删除不再被使用的素材记录与对应的 `R2 object`。

但仍存在一个缺口：

- 管理端先上传图片到 `R2` 并创建 `asset` 记录；
- 如果用户上传后没有继续保存表单，或中途离开页面；
- 这类“已上传但未进入最终业务引用”的素材，会长期留在数据库和 `R2` 中，形成孤儿对象。

本次实现的目标就是补上这个缺口，同时满足以下约束：

- 不误删仍被达人、档案或活动内容引用的素材；
- 不误删本地静态演示资源；
- 不在用户刚上传、尚未完成编辑时过早清理；
- 能在生产环境中自动定时执行，无需人工介入。

## 2. 方案概览

本次实现采用“两层清理”策略：

### 2.1 保存时即时清理

保留并复用原有的“候选素材清理”流程：

- 当用户在编辑达人或档案时替换、清空图片；
- 保存时会把旧素材 ID 作为 `cleanupCandidateAssetIds` 传入；
- 服务端重新计算引用关系；
- 若素材已无引用，则删除数据库记录，并删除对应 `R2 object`。

### 2.2 定时兜底清理

新增“孤儿素材定时清理”流程：

- 周期性扫描 `assets`；
- 找出当前没有业务引用的素材；
- 仅清理能够确认对应 `R2 object key` 的素材；
- 仅清理超过宽限时间的素材；
- 删除数据库记录后，再尝试删除对应的 `R2 object`。

这套定时清理主要负责兜底以下场景：

- 上传成功但未保存表单；
- 上传后切换页面或关闭浏览器；
- 管理端异常中断，导致素材记录残留。

## 3. 本次实现内容

### 3.1 抽离统一的素材清理模块

新增独立模块：

- `src/modules/assets/cleanup.ts`

该模块统一提供：

- `collectReferencedAssetIds(state)`
- `cleanupUnusedAssets(candidateIds)`
- `cleanupOrphanedAssets()`

这样管理端保存流程和定时任务共用同一套清理逻辑，避免两套实现长期分叉。

### 3.2 资产记录补齐时间信息

在 `saveAsset()` 新建素材记录时，统一写入：

- `createdAt: new Date().toISOString()`

孤儿素材定时清理会依赖 `createdAt` 做宽限期判断，避免用户刚上传完图片、还未来得及点击保存时就被过早清理。

说明：

- 数据库层的 `assets.created_at` 字段原本已经存在；
- 本次改动主要是把应用层的 `Asset` 类型和仓储映射补齐；
- 不涉及新的表结构迁移。

### 3.3 删除动作增加“仍未被引用”保护

为了降低并发场景下的误删风险，本次把仓储层删除能力调整为：

- `deleteAssetIfUnreferenced(id): Promise<boolean>`

行为如下：

- 如果素材当前仍被引用，则不删除并返回 `false`；
- 只有确认没有引用时，才真正删除数据库记录并返回 `true`。

这层保护在两种仓储实现中都已补齐：

- `mock repository`
- `postgres repository`

其中 `postgres repository` 使用“仅在未被引用时才删除”的数据库级条件删除，进一步缩小应用层判断和最终删除之间的竞态窗口。

### 3.4 只清理可确定属于 R2 的素材

孤儿素材定时任务不会扫描所有图片，而是只清理满足以下任一条件的素材：

- `asset.objectKey` 已存在；
- 能从 `R2_PUBLIC_BASE_URL` + `asset.url` 推导出 `objectKey`。

这意味着以下资源不会被定时误删：

- 本地静态演示图；
- 非 `R2` 域名的外部图片；
- 无法确认对象归属的 URL。

### 3.5 新增 cron API 路由

新增生产用定时入口：

- `src/app/api/cron/cleanup-orphan-assets/route.ts`

路由职责：

- 校验 `Authorization: Bearer ${CRON_SECRET}`；
- 调用 `cleanupOrphanedAssets()`；
- 返回本次扫描与清理结果；
- 在执行失败时返回 `500` 并输出错误日志。

### 3.6 新增 Vercel Cron 配置

新增文件：

- `vercel.json`

当前配置为：

- 路径：`/api/cron/cleanup-orphan-assets`
- 调度：`17 3 * * *`

对应时间：

- `03:17 UTC`
- `11:17 Asia/Shanghai`

之所以先使用“每天一次”，是为了兼容 `Vercel Hobby` 计划下“最短每天一次”的限制；如果后续切换到 `Pro`，可以再调整为每小时或更高频率。

## 4. 环境变量

本次新增以下环境变量：

```env
CRON_SECRET=...
ORPHAN_ASSET_GRACE_MINUTES=30
ORPHAN_ASSET_CLEANUP_LIMIT=50
```

说明如下：

- `CRON_SECRET`
  - 用于保护 cron API；
  - 未配置时，路由不会执行清理。
- `ORPHAN_ASSET_GRACE_MINUTES`
  - 孤儿素材宽限时间，默认 `30` 分钟；
  - 只有超过该时间且仍未被引用的素材才会被清理。
- `ORPHAN_ASSET_CLEANUP_LIMIT`
  - 单次定时任务最多处理的素材数，默认 `50`；
  - 避免异常堆积时单次任务过重。

## 5. 影响范围

本次改动涉及以下主要文件：

- `src/modules/assets/cleanup.ts`
- `src/modules/admin/mutations.ts`
- `src/modules/repository/types.ts`
- `src/modules/repository/mock-repository.ts`
- `src/modules/repository/postgres-repository.ts`
- `src/modules/domain/types.ts`
- `src/lib/env.ts`
- `src/app/api/cron/cleanup-orphan-assets/route.ts`
- `vercel.json`
- `.env.example`
- `scripts/seed.ts`
- `tests/unit/assets/cleanup.test.ts`
- `tests/unit/lib/env.test.ts`

## 6. 验证结果

本次实现已完成以下验证：

```powershell
npm test
npm run lint
npm run build
```

结果：

- 单元测试通过；
- ESLint 检查通过；
- Next.js 生产构建通过。

新增测试重点覆盖以下场景：

- 超过宽限期的孤儿 `R2` 素材会被清理；
- 仍在宽限期内的孤儿素材不会被清理；
- 即使超过宽限期，只要素材仍被业务引用，也不会被清理。

## 7. 上线后需要完成的操作

在正式环境启用这套能力前，还需要确认以下事项：

1. 在 `Vercel Production` 环境中配置 `CRON_SECRET`。
2. 按需配置 `ORPHAN_ASSET_GRACE_MINUTES` 与 `ORPHAN_ASSET_CLEANUP_LIMIT`。
3. 确认生产环境中的 `R2_*` 变量已完整配置。
4. 确认 `Vercel Cron` 已在生产部署中生效。
5. 首次上线后观察一到两个调度周期，确认没有误删业务素材。

## 8. 当前限制与后续建议

当前实现仍有以下边界：

- 在 `Vercel Hobby` 下，cron 频率只能做到“每天一次”；
- 因此孤儿素材的最长残留时间约为“调度间隔 + 宽限时间”；
- 若需要更快回收，可在 `Pro` 下改为每小时执行一次。

后续可考虑的增强项：

1. 为 cron 清理增加结构化日志或后台状态面板。
2. 为清理结果增加告警阈值，例如单次清理量异常升高时通知维护者。
3. 为管理端补充“上传后未保存即离开页面”的前端提示，进一步减少孤儿素材产生。
4. 如后续素材引用关系继续扩展，统一接入 `collectReferencedAssetIds()`，保持清理逻辑单点维护。

## 9. 结论

截至 `2026-04-18`，TIANTI 已具备完整的“R2 孤儿素材定时清理”能力。

本次交付补齐了上传后未保存场景下的素材残留问题，同时保留并增强了现有的保存时即时清理能力。整体方案以“引用校验 + 宽限期 + 定时兜底”为核心，能够在当前项目架构下较稳妥地控制 `R2` 存储残留与误删风险。
