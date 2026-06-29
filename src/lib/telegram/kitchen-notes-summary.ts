import { listCheckedInGuestKitchenNotes } from "../guest-profiles";

export function buildKitchenNotesTelegramSummary(): string {
  const notes = listCheckedInGuestKitchenNotes();
  const title = "Guest Profile Kitchen Notes";

  if (notes.length === 0) {
    return [title, "No guest profile kitchen notes."].join("\n\n");
  }

  return [
    title,
    notes
      .map(
        (note, index) =>
          `${index + 1}. Room ${formatValue(note.roomNumber)} - ${
            note.name
          }\n   ${note.kitchenNotes.trim()}`,
      )
      .join("\n\n"),
  ].join("\n\n");
}

function formatValue(value: string | null | undefined): string {
  return value || "-";
}
