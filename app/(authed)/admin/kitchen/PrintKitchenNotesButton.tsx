"use client";

type PrintKitchenNotesButtonProps = {
  label: string;
};

export default function PrintKitchenNotesButton({
  label,
}: PrintKitchenNotesButtonProps) {
  return (
    <button
      className="kitchen-screen-only inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
      onClick={() => window.print()}
      type="button"
    >
      {label}
    </button>
  );
}
