export default function PersonalizationLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
        <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
      </div>

      <section className="max-w-3xl rounded-lg border border-black/5 bg-surface px-4 py-5 sm:px-5">
        <div className="grid gap-5">
          <div>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-2 h-10 w-full" />
          </div>
          <div>
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-2 h-24 w-full" />
          </div>
          <div>
            <SkeletonBlock className="h-4 w-28" />
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SkeletonBlock className="h-20 w-20" />
              <div className="flex-1">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="mt-2 h-4 w-56 max-w-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <SkeletonBlock className="h-10 w-36" />
        </div>
      </section>
    </main>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-md bg-surface ${className}`} />;
}
