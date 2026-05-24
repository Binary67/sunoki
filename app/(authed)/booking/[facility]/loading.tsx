export default function FacilityBookingLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-2">
      <main className="min-h-[22rem] bg-surface px-6 py-8 sm:px-10 lg:min-h-0 lg:px-12 lg:py-12">
        <div className="h-5 w-28 rounded-md bg-black/10" />
        <div className="mt-10 h-10 w-64 max-w-full rounded-md bg-black/10" />
        <div className="mt-4 h-4 w-full max-w-xl rounded-md bg-black/10" />
        <div className="mt-2 h-4 w-5/6 max-w-lg rounded-md bg-black/10" />
        <div className="mt-10 flex flex-wrap gap-2">
          <div className="h-8 w-24 rounded-md bg-black/10" />
          <div className="h-8 w-28 rounded-md bg-black/10" />
          <div className="h-8 w-24 rounded-md bg-black/10" />
        </div>
      </main>
      <aside className="space-y-6 border-t border-black/5 px-4 py-6 sm:px-6 sm:py-8 lg:border-l lg:border-t-0">
        <section className="rounded-2xl border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="h-5 w-36 rounded-md bg-surface" />
            <div className="h-7 w-32 rounded-full bg-surface" />
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, index) => (
              <div
                key={index}
                className="aspect-square rounded-full bg-surface"
              />
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-black/5 bg-white p-5">
          <div className="h-5 w-28 rounded-md bg-surface" />
          <div className="mt-5 grid gap-3">
            <div className="h-12 rounded-xl border border-black/5 bg-surface" />
            <div className="h-12 rounded-xl border border-black/5 bg-surface" />
            <div className="h-12 rounded-xl border border-black/5 bg-surface" />
          </div>
          <div className="mt-6 h-10 rounded-full bg-surface" />
        </section>
      </aside>
    </div>
  );
}
