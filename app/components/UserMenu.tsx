"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAction } from "../logout/actions";

export default function UserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="size-8 rounded-full bg-gradient-to-br from-[#c9a78b] to-[#7a5b4a] ring-2 ring-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-brand"
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-black/5 bg-white py-1 shadow-lg"
        >
          <div className="px-4 py-2.5 border-b border-black/5">
            <div className="text-[11px] tracking-wider text-ink/50">
              SIGNED IN AS
            </div>
            <div className="mt-0.5 text-sm font-medium text-ink truncate">
              {username}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-2.5 text-left text-sm text-ink/80 hover:bg-surface"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
