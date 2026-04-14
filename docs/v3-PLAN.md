# TIANTI V3：前台发现能力重构

## Summary
- v3 主线从 `v2` 的后台提效切到公开站“更强发现”：优先提升内容可找性、跨页面跳转效率、搜索命中质量和 SEO。
- 不新增文章/专题/用户系统，继续只围绕 `达人 / 活动 / 天梯 / 档案` 四类既有内容做重组。
- 允许对现有模型做重构，但本轮重构限定在 `talent` 与 `event` 的发现字段、查询层和公开站读模型；不引入新的 Vercel 绑定，保持后续迁服务器可移植。
- 发布方式采用 preview-first：实现前先把本地 `main` 从 `dcab65e` 同步到 `origin/main@5b503e1`，v3 全程在 `codex/tianti-v3@fcc47db` 上开发、推 GitHub、看 Vercel preview，不直接动 production。

## Interfaces
- 给 `Talent` 和 `Event` 增加发现字段：`aliases: string[]`、`searchKeywords: string[]`；数据库采用新增数组列，默认空数组，同步更新 Drizzle schema、mock store、repository DTO、admin payload。
- 扩展 `TalentFilters`：新增 `sort?: "relevance" | "recent" | "future" | "archiveCount"`。
- 扩展 `EventFilters`：新增 `sort?: "relevance" | "upcoming" | "recent" | "lineupSize"`。
- 扩展站内搜索接口：`/search` 新增 `scope=all|talents|events`，保留现有 `q`。
- 新增公开读模型：`RelatedTalentSummary`、`RelatedEventSummary`、`DiscoverySection`，统一由 query/service 层生成，不在页面内临时拼装。
- 扩展后台写接口字段：`/api/admin/talents`、`/api/admin/events` 接收并保存 `aliases` 与 `searchKeywords`。

## Implementation Changes
- 基线与发布流：
  - 先同步本地 `main` 到远端，确认当前 production 仍对应 `5b503e1`。
  - 保留 `codex/tianti-v3` 为唯一 v3 工作分支；每个里程碑都 push 并检查对应 Vercel preview 是否指向同一 commit。
- 查询与排序重构：
  - 重写 `listTalents`、`listEventSummaries`、`searchSite`，把匹配来源从简单 substring 提升为加权匹配：名称高于别名，别名高于标签/关键词，活动再额外考虑城市、场馆和阵容达人命中。
  - 新增“相关内容”计算：达人详情基于活动共现和档案共现生成相关达人/活动；活动详情基于共享阵容、同城、时间邻近生成相关活动。
- 公开站发现体验：
  - 首页改成 discovery hub，固定展示“近期活动”“最近更新达人”“按标签发现”“编辑视角入口”“天梯亮点”，全部跳现有 `/talents`、`/events`、`/search`。
  - `/talents` 升级为发现页：保留现有筛选，新增 `sort`，结果头部显示总数与当前筛选摘要；默认无搜索词按 `recent`，有搜索词按 `relevance`。
  - `/events` 升级为活动发现页：保留现有筛选，新增 `sort` 和状态快速 chip；默认未来活动按 `upcoming`，已结束活动按 `recent`，有搜索词按 `relevance`。
  - `/search` 升级为统一检索页：默认混合返回并分组展示，支持只看达人或只看活动。
  - 达人详情页新增“相关达人”“相关活动”；活动详情页新增“同阵容达人”“相关活动”，强化从一页跳到另一页的发现链路。
- 后台支撑与 SEO：
  - `/admin/talents` 新增别名与搜索关键词编辑区。
  - `/admin/archives` 中的活动信息表单新增别名与搜索关键词编辑区。
  - 为首页、列表页、详情页、搜索页补 `generateMetadata`；新增 `sitemap.ts`、`robots.ts`；活动详情输出 `Event` JSON-LD。
  - 不引入 Vercel-only 能力；SEO 和发现逻辑都保持在标准 Next.js / server runtime 可迁范围内。

## Test Plan
- 单测覆盖：
  - 别名/关键词参与后的搜索排序是否稳定。
  - `TalentFilters.sort` 与 `EventFilters.sort` 的默认值和切换逻辑。
  - 相关达人、相关活动的计算和去重逻辑。
- E2E 覆盖：
  - 首页 discovery 入口能跳到带筛选条件的 `/talents` 或 `/events`。
  - 后台填写达人/活动别名与关键词后，公开 `/search` 和列表页能正确命中。
  - 达人详情与活动详情的相关内容区能完成跨页跳转。
  - 旧的 `/schedule -> /events`、`/admin/events -> /admin/archives` 兼容行为继续成立。
- 发布验证：
  - 继续执行 `npm run lint`、`npm test`、`npm run build`、`npm run test:e2e`。
  - 每个 milestone push 后确认 GitHub 分支 head 与 Vercel preview commit 一致。

## Assumptions
- v3 不做文章/专题模型，不做访客账户、收藏、评论、关注。
- 本轮允许数据库迁移，但只用于增强既有 `talents/events` 的发现能力，不改权限边界，不改档案归属模型。
- 未来“从 Vercel 迁到服务器”不纳入 v3 交付范围；v3 只保证不新增平台锁定点，便于后续迁移。
