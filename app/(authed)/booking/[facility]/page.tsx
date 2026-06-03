import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";

export default async function FacilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect("/");
}
