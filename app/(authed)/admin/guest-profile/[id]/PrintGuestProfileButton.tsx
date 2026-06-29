"use client";

export default function PrintGuestProfileButton() {
  function handlePrint() {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    document.title = " ";
    window.addEventListener("afterprint", restoreTitle);
    window.print();
  }

  return (
    <button
      className="inline-flex h-9 items-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
      onClick={handlePrint}
      type="button"
    >
      Print
    </button>
  );
}
