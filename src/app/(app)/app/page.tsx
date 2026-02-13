import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";

export default async function AppIndexPage() {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect("/login");
  }

  redirect("/app/checkin");
}

