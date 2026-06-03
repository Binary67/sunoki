export default function AdminDataLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
          <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-9 w-32" />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        <SkeletonBlock className="h-9 w-24" />
        <SkeletonBlock className="h-9 w-28" />
        <SkeletonBlock className="h-9 w-24" />
      </nav>

      <section className="mb-7 rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="mt-2 h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <SkeletonBlock className="h-9 w-28" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SkeletonBlock className="h-5 w-36" />
          <div className="flex flex-col gap-2 sm:items-end">
            <SkeletonBlock className="h-8 w-40" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-black/5">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-4 bg-surface px-4 py-3">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonBlock key={index} className="h-3 w-20" />
              ))}
            </div>
            <div className="divide-y divide-black/5">
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3"
                >
                  {Array.from({ length: 4 }, (_, cellIndex) => (
                    <SkeletonBlock key={cellIndex} className="h-4 w-full" />
                  ))}
                  <div className="flex justify-end">
                    <SkeletonBlock className="h-7 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SkeletonBlock className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-9 w-20" />
            <SkeletonBlock className="h-9 w-16" />
          </div>
        </div>
      </section>
    </main>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-md bg-surface ${className}`} />;
}
