"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssociateCompany } from "@/app/(app)/app/visit/[id]/associate-company";

type PostCheckoutCompanyModalProps = {
  visitId: string;
  onClose: () => void;
};

export function PostCheckoutCompanyModal({
  visitId,
  onClose,
}: PostCheckoutCompanyModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"prompt" | "associate">("prompt");

  function goToVisitDetail() {
    onClose();
    router.push(`/app/visit/${visitId}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        {step === "prompt" ? (
          <>
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Associar empresa?</h2>
            </div>
            <div className="space-y-4 p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Esta visita foi concluída sem empresa associada. Deseja associar
                a visita a uma empresa agora?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goToVisitDetail}
                  className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => setStep("associate")}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Sim
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4">
            <AssociateCompany
              visitId={visitId}
              embedded
              onSuccess={goToVisitDetail}
            />
            <button
              type="button"
              onClick={goToVisitDetail}
              className="mt-3 w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Ignorar e ir para detalhe da visita
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
