"use client";

import { useState } from "react";
import type { UserRole } from "@/src/lib/roles";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function LayoutShell({
  role,
  user,
  children,
}: {
  role: UserRole;
  user: { username: string };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-1 w-full bg-white text-ink">
      <Sidebar
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onMenuClick={() => setMobileOpen(true)} />
        {children}
      </div>
    </div>
  );
}
