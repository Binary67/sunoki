import { listCheckedInGuestKitchenNotes } from "@/src/lib/guest-profiles";
import PrintKitchenNotesButton from "./PrintKitchenNotesButton";

export default function KitchenPage() {
  const notes = listCheckedInGuestKitchenNotes();

  return (
    <main className="kitchen-print-page flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <style>{`
        .kitchen-print-only {
          display: none;
        }

        @media print {
          @page {
            margin: 10mm;
          }

          body:has(.kitchen-print-page) {
            background: #fff;
          }

          body:has(.kitchen-print-page) aside,
          body:has(.kitchen-print-page) header,
          body:has(.kitchen-print-page) .kitchen-screen-only {
            display: none !important;
          }

          body:has(.kitchen-print-page) .h-screen {
            height: auto !important;
          }

          body:has(.kitchen-print-page) .overflow-hidden,
          body:has(.kitchen-print-page) .overflow-y-auto {
            overflow: visible !important;
          }

          body:has(.kitchen-print-page) .kitchen-print-page {
            padding: 0 !important;
          }

          body:has(.kitchen-print-page) .kitchen-print-only {
            display: block !important;
          }

          body:has(.kitchen-print-page) .kitchen-print-grid {
            color: #000;
            display: grid;
            font-size: 9.5pt;
            gap: 4mm;
            grid-template-columns: 1fr 1fr;
            line-height: 1.25;
          }

          body:has(.kitchen-print-page) .kitchen-print-card {
            border: 1px solid #999;
            break-inside: avoid;
            padding: 4px 6px;
          }

          body:has(.kitchen-print-page) .kitchen-print-meta {
            align-items: baseline;
            display: flex;
            gap: 8px;
            justify-content: space-between;
            margin-bottom: 3px;
          }

          body:has(.kitchen-print-page) .kitchen-print-name,
          body:has(.kitchen-print-page) .kitchen-print-room {
            font-weight: 700;
          }

          body:has(.kitchen-print-page) .kitchen-print-room {
            flex: 0 0 auto;
          }

          body:has(.kitchen-print-page) .kitchen-print-note {
            margin: 0;
            white-space: pre-wrap;
          }
        }
      `}</style>

      <div className="kitchen-screen-only mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            Kitchen
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
            Checked-in guest kitchen notes for daily preparation.
          </p>
        </div>
        {notes.length > 0 && <PrintKitchenNotesButton />}
      </div>

      <section className="kitchen-print-only">
        {notes.length === 0 ? (
          <p>No kitchen notes.</p>
        ) : (
          <div className="kitchen-print-grid">
            {notes.map((note) => (
              <article className="kitchen-print-card" key={note.id}>
                <div className="kitchen-print-meta">
                  <span className="kitchen-print-name">{note.name}</span>
                  <span className="kitchen-print-room">
                    Room {formatValue(note.roomNumber)}
                  </span>
                </div>
                <p className="kitchen-print-note">{note.kitchenNotes}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="kitchen-screen-only">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-ink">Kitchen Notes</h2>
          <span className="text-xs text-ink/50">
            {notes.length} {notes.length === 1 ? "guest" : "guests"}
          </span>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-lg border border-black/5 bg-surface px-6 py-10 text-center text-sm text-ink/60">
            No kitchen notes for checked-in guests.
          </div>
        ) : (
          <div className="grid gap-3">
            {notes.map((note) => (
              <article
                className="kitchen-note-card rounded-lg border border-black/5 bg-white px-4 py-4"
                key={note.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-base font-semibold text-ink">
                    {note.name}
                  </h3>
                  <span className="w-fit rounded-md border border-brand/15 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand">
                    Room {formatValue(note.roomNumber)}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/80">
                  {note.kitchenNotes}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
