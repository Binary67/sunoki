export default function GuestProfileDetailLoading() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-4 w-36 rounded-md bg-surface" />
          <div className="mt-4 h-8 w-56 rounded-md bg-surface" />
          <div className="mt-3 h-4 w-40 rounded-md bg-surface" />
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-24 rounded-md bg-surface" />
            <div className="h-9 w-28 rounded-md bg-surface" />
            <div className="h-9 w-24 rounded-md bg-surface" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-24 rounded-md bg-surface" />
            <div className="h-9 w-16 rounded-md bg-surface" />
          </div>
        </div>
      </div>
      <div className="grid gap-5">
        {Array.from({ length: 4 }, (_, sectionIndex) => (
          <section
            key={sectionIndex}
            className="rounded-lg border border-black/5 bg-white px-4 py-5 sm:px-5"
          >
            <div className="h-5 w-36 rounded-md bg-surface" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, fieldIndex) => (
                <div key={fieldIndex}>
                  <div className="h-3 w-24 rounded-md bg-surface" />
                  <div className="mt-2 h-5 w-48 max-w-full rounded-md bg-surface" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
