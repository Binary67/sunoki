import { getBrandingSettings } from "@/src/lib/branding";
import { ToastProvider } from "../components/Toast";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const branding = getBrandingSettings();

  return (
    <ToastProvider>
      <LoginForm branding={branding} />
    </ToastProvider>
  );
}
