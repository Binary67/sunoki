import { getBrandingSettings } from "@/src/lib/branding";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const branding = getBrandingSettings();

  return <LoginForm branding={branding} />;
}
