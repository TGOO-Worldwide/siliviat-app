"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(4, "Password demasiado curta"),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app/checkin";

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
      setError(firstError ?? "Credenciais inválidas");
      return;
    }

    setLoading(true);
    const signInResult = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });
    setLoading(false);

    if (signInResult?.error) {
      setError("Email ou password incorretos.");
      return;
    }

    router.push(callbackUrl);
  }

  function handlePasskeyLogin() {
    // Stub para Passkeys/WebAuthn – será implementado numa fase posterior.
    alert(
      "Entrada rápida com Passkey/WebAuthn será implementada nas próximas fases."
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          TGOO Visitas
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Aceda ao painel interno para registar visitas, vendas e follow-ups.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-md transition active:scale-95 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handlePasskeyLogin}
            className="flex h-11 w-full items-center justify-center rounded-full border border-dashed border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Entrada rápida (Passkey / biometria)
          </button>

          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Ao continuar, aceita o uso de{" "}
            <span className="font-medium">geolocalização</span> e{" "}
            <span className="font-medium">microfone</span> apenas para registo
            interno de visitas e qualidade de serviço.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">A carregar...</div>}>
      <LoginForm />
    </Suspense>
  );
}

