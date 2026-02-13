"use client";

import { useState } from "react";

interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  nif: string | null;
  createdAt: string;
  _count: {
    visits: number;
    sales: number;
  };
}

interface CompaniesAdminClientProps {
  initialCompanies: Company[];
  initialTotal: number;
}

export default function CompaniesAdminClient({
  initialCompanies,
  initialTotal,
}: CompaniesAdminClientProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [total, setTotal] = useState(initialTotal);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    nif: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const limit = 20;

  // Buscar empresas
  const fetchCompanies = async (query: string = searchQuery, pageNum: number = page) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        ...(query && { query }),
      });

      const response = await fetch(`/api/companies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
        setTotal(data.pagination.total);
      } else {
        setError("Erro ao buscar empresas");
      }
    } catch (err) {
      setError("Erro ao buscar empresas");
    } finally {
      setLoading(false);
    }
  };

  // Debounce para pesquisa
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    setTimeout(() => fetchCompanies(value, 1), 300);
  };

  // Abrir modal de edição
  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      nif: company.nif || "",
    });
    setError("");
    setShowEditModal(true);
  };

  // Abrir modal de criação
  const handleCreate = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      nif: "",
    });
    setError("");
    setShowCreateModal(true);
  };

  // Submeter criação
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setSuccessMessage("Empresa criada com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchCompanies();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao criar empresa");
      }
    } catch (err) {
      setError("Erro ao criar empresa");
    } finally {
      setLoading(false);
    }
  };

  // Submeter edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingCompany(null);
        setSuccessMessage("Empresa atualizada com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchCompanies();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao atualizar empresa");
      }
    } catch (err) {
      setError("Erro ao atualizar empresa");
    } finally {
      setLoading(false);
    }
  };

  // Remover empresa
  const handleDelete = async (company: Company) => {
    if (!window.confirm(`Tem certeza que deseja remover "${company.name}"?`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage("Empresa removida com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchCompanies();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao remover empresa");
      }
    } catch (err) {
      setError("Erro ao remover empresa");
    } finally {
      setLoading(false);
    }
  };

  // Paginação
  const totalPages = Math.ceil(total / limit);
  const handlePrevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchCompanies(searchQuery, newPage);
    }
  };
  const handleNextPage = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      fetchCompanies(searchQuery, newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Empresas</h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Nova Empresa
        </button>
      </div>

      {/* Mensagens de sucesso/erro */}
      {successMessage && (
        <div className="rounded-lg bg-emerald-100 p-3 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-red-800 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Barra de pesquisa */}
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <input
          type="text"
          placeholder="Pesquisar empresas por nome..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>

      {/* Lista de empresas */}
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {loading && <p className="text-center text-zinc-600">A carregar...</p>}

        {!loading && companies.length === 0 && (
          <p className="text-center text-zinc-600">Nenhuma empresa encontrada.</p>
        )}

        {!loading && companies.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="pb-2 text-left font-medium">Nome</th>
                  <th className="pb-2 text-left font-medium">Telefone</th>
                  <th className="pb-2 text-left font-medium">Email</th>
                  <th className="pb-2 text-left font-medium">NIF</th>
                  <th className="pb-2 text-left font-medium">Visitas</th>
                  <th className="pb-2 text-left font-medium">Vendas</th>
                  <th className="pb-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="py-3 font-medium">{company.name}</td>
                    <td className="py-3">{company.phone || "—"}</td>
                    <td className="py-3">{company.email || "—"}</td>
                    <td className="py-3">{company.nif || "—"}</td>
                    <td className="py-3">{company._count.visits}</td>
                    <td className="py-3">{company._count.sales}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleEdit(company)}
                        className="mr-2 text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(company)}
                        className="text-red-600 hover:underline"
                        disabled={company._count.visits > 0 || company._count.sales > 0}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Página {page} de {totalPages} ({total} empresas)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm disabled:opacity-50 dark:bg-zinc-800"
              >
                Anterior
              </button>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm disabled:opacity-50 dark:bg-zinc-800"
              >
                Seguinte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-bold">Nova Empresa</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Morada</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">NIF</label>
                <input
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "A criar..." : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg bg-zinc-200 px-4 py-2 dark:bg-zinc-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-bold">Editar Empresa</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Morada</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">NIF</label>
                <input
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "A guardar..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCompany(null);
                  }}
                  className="flex-1 rounded-lg bg-zinc-200 px-4 py-2 dark:bg-zinc-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
