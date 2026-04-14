# TIANTI V2：编辑效率主线与发布基线补齐

## Summary
- 先把当前已完成的 `v1.1` 基线正式补齐：`origin/codex/tianti-v1.1` 的内容合入 `main`，让 Vercel production 从 `dcab65e` 升到当前 `b706498` 这条线。
- v2 按两阶段推进，主线聚焦后台编辑效率，不改现有权限模型，也不做数据库迁移。
- 第一阶段只深挖 `/admin/archives` 工作台，把“活动信息 + 阵容 + 我的档案”这条主链路做成无整页刷新、低重复录入、可安全中断恢复的工作流。
- 第二阶段补 `/admin/talents` 和活动管理的批量操作，把高频整理动作收敛成多选批处理，而不是继续靠单条编辑。

## Implementation Changes
### 1. 发布基线与协作流程
- 以当前 `codex/tianti-v2` 所在提交为基线，先整理出一条 `v1.1 -> main` 的同步任务：本地验证通过后推送到 GitHub，合入 `main`，再确认 Vercel production 跟到同一提交。
- 约定分支与部署规则：
  - `main` 只承接可上线版本，并驱动 Vercel production。
  - `codex/*` 或功能分支只承接预览部署，不直接代表生产。
- 补最小 GitHub CI：在 push/PR 到 `main` 与 `codex/*` 时跑 `npm run lint`、`npm test`、`npm run build`。
- 更新项目文档，补回当前缺失/过期的环境与发布说明，明确 preview / production / GitHub / Vercel 的关系，以及标准发布检查清单。

### 2. Phase 1：活动档案工作台提效
- 保持路由仍为 `/admin/archives?event=<eventId>`，但把当前单文件 `ArchiveManager` 拆成独立模块：活动列表面板、活动基础信息表单、阵容编辑器、档案编辑器、素材面板、共享状态 hook/reducer。
- 去掉保存后的 `window.location.assign` / `window.location.reload` 式整页刷新，改为接口返回最新实体后在客户端局部更新，并继续保留当前选中 `event`。
- 保留“两套保存动作”：
  - `保存活动信息`
  - `保存我的档案`
  保存任一部分后都不丢失另一部分未提交草稿。
- 新增工作台级脏状态管理：
  - 活动信息、阵容、档案三块分别显示未保存状态。
  - 切换活动、离开页面、关闭标签页前做未保存提醒。
- 把重复录入改成快捷动作：
  - 新建档案条目时默认优先使用当前活动阵容中的达人，而不是全局第一个达人。
  - 提供“从当前阵容导入档案条目”操作，只补齐尚未出现在档案中的阵容达人，不重复生成已有条目。
  - 档案条目支持“复制上一条”快捷动作，减少同场活动的重复填写。
- 加强前端校验与错误展示：在提交前就拦截空字段、缺素材、重复 slug 等明显错误；接口错误在对应区域内显示，不只给一个全局提示。

### 3. Phase 2：批量管理
- 在 `/admin/talents` 增加多选列表与批量动作栏。
- 新增人才批量接口与类型：
  - `POST /api/admin/talents/bulk`
  - `BulkTalentAction = { action: "add_tags" | "remove_tags" | "delete"; ids: string[]; tags?: string[] }`
  - 返回 `BulkActionResult = { succeededIds: string[]; blocked: Array<{ id: string; reason: string }> }`
- 在活动管理侧增加多选批量动作，入口可放在 `/admin/archives` 的活动列表区，不再恢复单独的 `/admin/events` 编辑流。
- 新增活动批量接口与类型：
  - `POST /api/admin/events/bulk`
  - `BulkEventAction = { action: "set_status" | "delete"; ids: string[]; status?: "future" | "past" }`
  - 删除时沿用现有档案引用保护，允许部分成功、部分阻止，并把阻止原因逐条返回。
- 批量操作默认只覆盖当前已勾选项，不做“全筛选结果批量执行”这类高风险隐式行为。

## Test Plan
- 基线同步：
  - 本地通过 `lint`、单测、`build`。
  - `main` 合入后 Vercel production 指向与 GitHub `main` 相同提交。
  - 分支预览仍可从 `codex/*` 正常生成。
- 工作台：
  - 新建活动后无需整页跳转即可继续编辑同一活动档案。
  - 切换活动或关闭页面时，未保存内容会提示。
  - “从阵容导入档案条目”只导入缺失达人，不产生重复条目。
  - 保存活动信息后，档案草稿不丢失；保存档案后，活动草稿不丢失。
- 批量管理：
  - 批量加标签/删标签只影响选中达人。
  - 批量改活动状态只影响选中活动。
  - 批量删除时，被档案引用的对象会被逐条拦截并返回原因。
- 回归：
  - 现有 `/schedule -> /events`、`/admin/events -> /admin/archives` 兼容行为继续成立。
  - 现有公开站冒烟链路和登录链路继续通过。
  - E2E 从 1 个 smoke 文件扩到覆盖工作台快捷动作和批量操作的关键场景。

## Assumptions
- v2 默认不改 `events / event_lineup / editor_archives / archive_entries` 等表结构；如实现过程中发现必须迁移，再单开 v2.1 数据任务，不混入本次主线。
- 现有“共享活动/达人 + 编辑人私有档案/天梯榜”的权限边界保持不变。
- `mock` 模式继续保留给测试与本地兜底，但 preview / production 文档与发布流程一律按 `database + r2` 作为标准环境。
- 本次 v2 不额外扩展新的公开站栏目；公开站改动仅限为后台提效后的数据与状态提供更稳定展示。
