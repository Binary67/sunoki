export default function GuestProfileLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-8 w-48 rounded-md bg-surface" />
          <div className="mt-3 h-4 w-72 max-w-full rounded-md bg-surface" />
        </div>
        <div className="h-9 w-32 rounded-md bg-surface" />
      </div>
      <section className="rounded-lg border border-black/5 bg-white">
        <div className="border-b border-black/5 px-4 py-4 sm:px-5">
          <div className="h-5 w-40 rounded-md bg-surface" />
        </div>
        <div className="divide-y divide-black/5">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:px-5"
            >
              <div>
                <div className="h-5 w-48 rounded-md bg-surface" />
                <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-surface" />
              </div>
              <div className="h-8 w-24 rounded-md bg-surface" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
