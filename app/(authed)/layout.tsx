import { redirect } from "next/navigation";
import LayoutShell from "../components/LayoutShell";
import { ToastProvider } from "../components/Toast";
import { getCurrentUser } from "@/src/lib/auth";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <LayoutShell role={user.role} user={user}>
        {children}
      </LayoutShell>
    </ToastProvider>
  );
}
