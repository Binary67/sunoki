import type { Facility } from "./facility-content";

export default function FacilityHero({ facility }: { facility: Facility }) {
  return (
    <main className="px-10 py-8 min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">{facility.title}</h1>
      <p className="mt-3 text-sm leading-6 text-ink/60">{facility.description}</p>

      <div
        className={`relative mt-6 rounded-2xl overflow-hidden bg-gradient-to-br aspect-[16/9] lg:aspect-[21/9] xl:aspect-[16/9] ${facility.gradientClasses}`}
      >
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div
              className="font-serif italic text-3xl tracking-wide drop-shadow"
              style={{ color: facility.accentColor }}
            >
              {facility.serifName}
            </div>
            <div
              className="mt-1 text-[10px] tracking-[0.3em]"
              style={{ color: `${facility.accentColor}b3` }}
            >
              {facility.sublabel}
            </div>
          </div>
        </div>
        <div className="absolute left-4 bottom-4 flex flex-wrap gap-2">
          {facility.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/95 backdrop-blur px-3 py-1 text-[10px] font-medium tracking-wider text-ink"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
