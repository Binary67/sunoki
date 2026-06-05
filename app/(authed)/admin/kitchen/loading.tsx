export default function KitchenLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7">
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
        <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        <SkeletonBlock className="h-9 w-44" />
        <SkeletonBlock className="h-9 w-52" />
      </nav>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="mt-2 h-4 w-20" />
          </div>
          <SkeletonBlock className="h-9 w-32" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-9 w-[15.5rem]" />
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-9 w-24" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-black/5">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr] gap-4 bg-surface px-4 py-3">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonBlock key={index} className="h-3 w-20" />
              ))}
            </div>
            <div className="divide-y divide-black/5">
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-4"
                >
                  {Array.from({ length: 5 }, (_, cellIndex) => (
                    <SkeletonBlock key={cellIndex} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-md bg-surface ${className}`} />;
}
