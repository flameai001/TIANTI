export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 text-sm text-white/65 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div className="space-y-3">
          <p className="font-display text-2xl tracking-[0.2em] text-white">TIANTI</p>
          <p className="max-w-md leading-7">
            面向 cosplay 与国风圈层的公开展示与活动信息站。当前站点以演示内容运行，视觉与信息架构已按正式版本搭好。
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">Sections</p>
          <ul className="space-y-2">
            <li>首页 / 达人 / 天梯榜</li>
            <li>未来行程 / 活动档案</li>
            <li>编辑后台 / 搜索入口</li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">Status</p>
          <ul className="space-y-2">
            <li>公开站可直接浏览</li>
            <li>后台支持双编辑演示登录</li>
            <li>数据库与 R2 预留了后续接线点</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
