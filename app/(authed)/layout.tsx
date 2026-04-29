import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
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
      <div className="flex flex-1 w-full bg-white text-ink">
        <Sidebar role={user.role} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header user={user} />
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
