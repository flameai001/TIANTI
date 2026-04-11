import Image from "next/image";
import Link from "next/link";
import type { TalentSummary } from "@/modules/domain/types";

export function TalentCard({ talent }: { talent: TalentSummary }) {
  return (
    <Link
      href={`/talents/${talent.slug}`}
      className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={talent.cover.url}
          alt={talent.cover.alt}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
        <div className="absolute left-5 top-5 flex gap-2">
          {talent.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] tracking-[0.18em] text-white/75"
            >
              {tag}
            </span>
          ))}
        </div>
        {talent.hasFutureEvent ? (
          <span className="absolute bottom-5 right-5 rounded-full bg-[var(--color-accent)] px-3 py-1 text-[11px] tracking-[0.18em] text-black">
            Future
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-5 py-5">
        <div>
          <h3 className="text-2xl text-white">{talent.nickname}</h3>
          {talent.recentHint ? <p className="mt-2 text-sm text-white/60">{talent.recentHint}</p> : null}
        </div>
        <p className="line-clamp-3 text-sm leading-7 text-white/70">{talent.bio}</p>
      </div>
    </Link>
  );
}
