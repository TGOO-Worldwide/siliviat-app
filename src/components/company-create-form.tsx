"use client";

import { useState, useCallback } from "react";

export type CreatedCompany = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

type CompanyCreateFormProps = {
  onSuccess: (company: CreatedCompany) => void;
  idPrefix?: string;
};

export function CompanyCreateForm({
  onSuccess,
  idPrefix = "company",
}: CompanyCreateFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    nif: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreateCompany = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCreating(true);
      setCreateError("");

      try {
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Erro ao criar empresa.");
        }

        onSuccess({
          id: data.company.id,
          name: data.company.name,
          address: data.company.address,
          phone: data.company.phone,
        });
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Erro desconhecido."
        );
      } finally {
        setIsCreating(false);
      }
    },
    [formData, onSuccess]
  );

  return (
    <form
      onSubmit={handleCreateCompany}
      className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
        Criar Nova Empresa
      </h3>

      {createError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {createError}
        </div>
      )}

      <div>
        <label
          htmlFor={`${idPrefix}-name`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id={`${idPrefix}-name`}
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Nome da empresa"
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-address`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Morada
        </label>
        <input
          type="text"
          id={`${idPrefix}-address`}
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Rua, nº, código postal, cidade"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-phone`}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Telefone
          </label>
          <input
            type="text"
            id={`${idPrefix}-phone`}
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="+351 ..."
          />
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-nif`}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            NIF
          </label>
          <input
            type="text"
            id={`${idPrefix}-nif`}
            value={formData.nif}
            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="123456789"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-email`}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          type="email"
          id={`${idPrefix}-email`}
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="contato@empresa.pt"
        />
      </div>

      <button
        type="submit"
        disabled={isCreating || !formData.name.trim()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? "A criar..." : "Criar Empresa"}
      </button>
    </form>
  );
}
