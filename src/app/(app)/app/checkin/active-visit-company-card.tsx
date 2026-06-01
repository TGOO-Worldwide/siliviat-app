import Link from "next/link";

type ActiveVisitCompanyCardProps = {
  visitId: string;
  companyName: string;
};

export function ActiveVisitCompanyCard({
  visitId,
  companyName,
}: ActiveVisitCompanyCardProps) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
        <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Empresa associada
        </p>
        <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">
          {companyName}
        </p>
      </div>
      <Link
        href={`/app/visit/${visitId}`}
        className="mt-3 block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]"
      >
        Detalhe da Visita
      </Link>
    </section>
  );
}
