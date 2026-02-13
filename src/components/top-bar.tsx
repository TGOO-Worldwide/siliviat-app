"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

export function TopBar() {
  const { data: session } = useSession();
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const userName = session?.user?.name ?? session?.user?.email ?? "Utilizador";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 text-sm shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            online ? "bg-emerald-500" : "bg-zinc-400"
          }`}
        />
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={() => {
            // A lógica real de sync será implementada na Fase 9.
            console.log("Sync solicitado");
          }}
        >
          Sync
        </button>
        <div className="flex flex-col items-end">
          <span className="max-w-[140px] truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">
            {userName}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[11px] text-zinc-500 underline-offset-2 hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

