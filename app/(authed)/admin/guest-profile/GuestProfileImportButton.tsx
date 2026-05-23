"use client";

import { useRef, useState } from "react";

type ImportResponse =
  | { profile: Record<string, string> }
  | { message: string };

export default function GuestProfileImportButton() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [icNo, setIcNo] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function importProfile() {
    setMessage(null);
    if (!file) {
      setMessage("Choose an .xlsx file.");
      return;
    }
    if (!icNo.trim()) {
      setMessage("Enter an IC number.");
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("icNo", icNo);

      const response = await fetch("/admin/guest-profile/import", {
        body: formData,
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as
        | ImportResponse
        | null;

      if (!response.ok || !result || !("profile" in result)) {
        setMessage(
          result && "message" in result
            ? result.message
            : "Unable to import this workbook.",
        );
        return;
      }

      const form = triggerRef.current?.closest("form");
      if (!form) {
        setMessage("Unable to find the guest form.");
        return;
      }

      for (const [fieldName, value] of Object.entries(result.profile)) {
        setFormFieldValue(form, fieldName, value);
      }

      setFile(null);
      setIcNo("");
      setIsOpen(false);
    } catch {
      setMessage("Unable to import this workbook.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className="h-10 rounded-md border border-brand/25 px-4 text-sm font-medium text-brand hover:bg-brand/10"
        onClick={() => {
          setMessage(null);
          setIsOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        Upload File
      </button>

      {isOpen && (
        <div
          aria-labelledby="guest-profile-import-title"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <h3
                  className="text-base font-semibold text-ink"
                  id="guest-profile-import-title"
                >
                  Upload File
                </h3>
              </div>
              <button
                aria-label="Close upload file dialog"
                className="grid size-8 shrink-0 place-items-center rounded-md text-ink/55 hover:bg-surface hover:text-ink"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  x
                </span>
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5">
              <label className="block text-sm font-medium text-ink/75">
                Excel file
                <input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="mt-1 block w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  onChange={(event) =>
                    setFile(event.target.files?.item(0) ?? null)
                  }
                  type="file"
                />
              </label>

              <label className="block text-sm font-medium text-ink/75">
                IC Number
                <input
                  className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  onChange={(event) => setIcNo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void importProfile();
                    }
                  }}
                  type="text"
                  value={icNo}
                />
              </label>

              {message && (
                <p
                  className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-black/10 px-5 py-4">
              <button
                className="h-10 rounded-md border border-black/10 px-4 text-sm font-medium text-ink/70 hover:bg-surface"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending}
                onClick={() => void importProfile()}
                type="button"
              >
                {pending ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function setFormFieldValue(
  form: HTMLFormElement,
  fieldName: string,
  value: string,
): void {
  const field = form.elements.namedItem(fieldName);
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
