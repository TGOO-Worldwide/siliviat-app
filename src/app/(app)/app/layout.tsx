import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <TopBar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-3 pb-20 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

