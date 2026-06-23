import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { getBrandingSettings } from "@/src/lib/branding";
import { ToastProvider } from "../components/Toast";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const branding = getBrandingSettings();

  return (
    <ToastProvider>
      <LoginForm branding={branding} />
    </ToastProvider>
  );
}
