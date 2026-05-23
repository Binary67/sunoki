"use client";

import { useState } from "react";
import type { UserRole } from "@/src/lib/roles";
import type { BrandingSettings } from "./BrandBlock";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function LayoutShell({
  branding,
  role,
  user,
  children,
}: {
  branding: BrandingSettings;
  role: UserRole;
  user: { username: string };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-ink">
      <Sidebar
        branding={branding}
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        <Header user={user} onMenuClick={() => setMobileOpen(true)} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
