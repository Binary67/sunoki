export default function AuditLogLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SkeletonBlock className="h-8 w-32" />
          <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
          <SkeletonBlock className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <SkeletonBlock className="h-9 w-36" />
      </div>

      <section className="mb-6 grid gap-4 rounded-lg border border-black/5 bg-surface px-4 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="mt-2 h-10 w-full" />
        </div>
        <div>
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-2 h-10 w-full" />
        </div>
        <SkeletonBlock className="h-10 w-28" />
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-4 w-20" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-black/5">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px_1.4fr] gap-4 bg-surface px-4 py-3">
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonBlock key={index} className="h-3 w-20" />
              ))}
            </div>
            <div className="divide-y divide-black/5">
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_80px_1.4fr] gap-4 px-4 py-4"
                >
                  {Array.from({ length: 6 }, (_, cellIndex) => (
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
