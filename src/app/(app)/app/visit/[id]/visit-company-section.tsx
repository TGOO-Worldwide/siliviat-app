"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssociateCompany } from "./associate-company";

type VisitCompany = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
};

type VisitCompanySectionProps = {
  visitId: string;
  company: VisitCompany | null;
};

export function VisitCompanySection({
  visitId,
  company,
}: VisitCompanySectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  if (!company || isEditing) {
    return (
      <div className="space-y-3">
        <AssociateCompany
          visitId={visitId}
          mode={company ? "change" : "associate"}
          embedded
          onSuccess={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
        {company && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          EMPRESA
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          Alterar
        </button>
      </div>
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {company.name}
      </p>
      {company.address && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          📍 {company.address}
        </p>
      )}
      {company.phone && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          📞 {company.phone}
        </p>
      )}
    </div>
  );
}
