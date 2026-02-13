"use client";

import { useState, useEffect, useCallback } from "react";

type Company = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  nif?: string | null;
  createdAt: string;
  _count?: {
    visits: number;
    sales: number;
  };
};

type CompaniesClientProps = {
  initialCompanies?: Company[];
};

export default function CompaniesClient({ initialCompanies = [] }: CompaniesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    nif: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Debounce: atualiza debouncedQuery 300ms após última alteração
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pesquisa quando debouncedQuery muda
  useEffect(() => {
    const searchCompanies = async () => {
      setIsSearching(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (debouncedQuery) {
          params.set("query", debouncedQuery);
        }
        params.set("limit", "20");

        const res = await fetch(`/api/companies?${params.toString()}`);
        
        if (!res.ok) {
          throw new Error("Erro ao pesquisar empresas.");
        }

        const data = await res.json();
        setCompanies(data.companies || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
        setCompanies([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchCompanies();
  }, [debouncedQuery]);

  const handleCreateCompany = useCallback(async (e: React.FormEvent) => {
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

      // Adiciona a nova empresa à lista
      setCompanies((prev) => [data.company, ...prev]);
      
      // Limpa formulário e fecha
      setFormData({ name: "", address: "", phone: "", email: "", nif: "" });
      setShowCreateForm(false);
      
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setIsCreating(false);
    }
  }, [formData]);

  return (
    <div className="space-y-4">
      {/* Header com título e botão criar */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Empresas</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Pesquise ou crie empresas rapidamente
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800"
          >
            {showCreateForm ? "Cancelar" : "+ Nova Empresa"}
          </button>
        </div>

        {/* Formulário de criação (condicional) */}
        {showCreateForm && (
          <form onSubmit={handleCreateCompany} className="mb-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Criar Nova Empresa</h2>
            
            {createError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                {createError}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Morada
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Rua, nº, código postal, cidade"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Telefone
                </label>
                <input
                  type="text"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="+351 ..."
                />
              </div>

              <div>
                <label htmlFor="nif" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  NIF
                </label>
                <input
                  type="text"
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="123456789"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="contato@empresa.pt"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating || !formData.name.trim()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "A criar..." : "Criar Empresa"}
            </button>
          </form>
        )}

        {/* Barra de pesquisa */}
        <div>
          <input
            type="search"
            placeholder="🔍 Pesquisar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>
      </section>

      {/* Resultados */}
      <section className="space-y-3">
        {isSearching && (
          <div className="rounded-lg bg-white p-4 text-center text-sm text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
            A pesquisar...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 shadow-sm dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {!isSearching && !error && companies.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
            <p className="mb-2 text-zinc-600 dark:text-zinc-400">
              {searchQuery ? "Nenhuma empresa encontrada." : "Nenhuma empresa cadastrada."}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setFormData({ ...formData, name: searchQuery });
                  setShowCreateForm(true);
                  setSearchQuery("");
                }}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                Criar empresa "{searchQuery}"
              </button>
            )}
          </div>
        )}

        {!isSearching && !error && companies.length > 0 && (
          <div className="space-y-2">
            {companies.map((company) => (
              <article
                key={company.id}
                className="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900"
              >
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {company.name}
                </h3>
                
                {(company.address || company.phone || company.email || company.nif) && (
                  <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {company.address && <p>📍 {company.address}</p>}
                    {company.phone && <p>📞 {company.phone}</p>}
                    {company.email && <p>✉️ {company.email}</p>}
                    {company.nif && <p>🆔 NIF: {company.nif}</p>}
                  </div>
                )}

                {company._count && (
                  <div className="mt-3 flex gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                    <span>{company._count.visits} visitas</span>
                    <span>{company._count.sales} vendas</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
