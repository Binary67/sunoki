export default function DashboardLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-10">
        <SkeletonBlock className="h-8 w-36" />
        <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        <SkeletonBlock className="h-9 w-36" />
        <SkeletonBlock className="h-9 w-40" />
      </nav>

      <section className="mb-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-3 h-4 w-80 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="h-7 w-20" />
          </div>
        </div>

        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, levelIndex) => (
            <div
              key={levelIndex}
              className="rounded-lg border border-black/5 bg-white p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <SkeletonBlock className="h-5 w-16" />
                <SkeletonBlock className="h-4 w-12" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-11">
                {Array.from({ length: 11 }, (_, roomIndex) => (
                  <div
                    key={roomIndex}
                    className="min-h-[6.5rem] rounded-md border border-black/5 bg-surface px-2 py-2"
                  >
                    <SkeletonBlock className="h-4 w-10" />
                    <SkeletonBlock className="mt-3 h-3 w-14" />
                    <SkeletonBlock className="mt-2 h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-md bg-surface ${className}`} />;
}
