"use client";

import { useState } from "react";

interface Technology {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  _count: {
    sales: number;
  };
}

interface TechnologiesAdminClientProps {
  initialTechnologies: Technology[];
}

export default function TechnologiesAdminClient({
  initialTechnologies,
}: TechnologiesAdminClientProps) {
  const [technologies, setTechnologies] = useState<Technology[]>(initialTechnologies);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technology | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Buscar tecnologias
  const fetchTechnologies = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/technologies?activeOnly=false");
      if (response.ok) {
        const data = await response.json();
        setTechnologies(data.technologies);
      } else {
        setError("Erro ao buscar tecnologias");
      }
    } catch (err) {
      setError("Erro ao buscar tecnologias");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de criação
  const handleCreate = () => {
    setFormData({ name: "", description: "", active: true });
    setError("");
    setShowCreateModal(true);
  };

  // Abrir modal de edição
  const handleEdit = (tech: Technology) => {
    setEditingTech(tech);
    setFormData({
      name: tech.name,
      description: tech.description || "",
      active: tech.active,
    });
    setError("");
    setShowEditModal(true);
  };

  // Submeter criação
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/technologies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setSuccessMessage("Tecnologia criada com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchTechnologies();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao criar tecnologia");
      }
    } catch (err) {
      setError("Erro ao criar tecnologia");
    } finally {
      setLoading(false);
    }
  };

  // Submeter edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/technologies/${editingTech.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingTech(null);
        setSuccessMessage("Tecnologia atualizada com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchTechnologies();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao atualizar tecnologia");
      }
    } catch (err) {
      setError("Erro ao atualizar tecnologia");
    } finally {
      setLoading(false);
    }
  };

  // Remover tecnologia
  const handleDelete = async (tech: Technology) => {
    if (!window.confirm(`Tem certeza que deseja remover "${tech.name}"?`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/technologies/${tech.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage("Tecnologia removida com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchTechnologies();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao remover tecnologia");
      }
    } catch (err) {
      setError("Erro ao remover tecnologia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Tecnologias</h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Nova Tecnologia
        </button>
      </div>

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

      {/* Lista de tecnologias */}
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {loading && <p className="text-center text-zinc-600">A carregar...</p>}

        {!loading && technologies.length === 0 && (
          <p className="text-center text-zinc-600">Nenhuma tecnologia encontrada.</p>
        )}

        {!loading && technologies.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="pb-2 text-left font-medium">Nome</th>
                  <th className="pb-2 text-left font-medium">Descrição</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Vendas</th>
                  <th className="pb-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {technologies.map((tech) => (
                  <tr key={tech.id}>
                    <td className="py-3 font-medium">{tech.name}</td>
                    <td className="py-3">
                      {tech.description ? (
                        <span className="text-xs text-zinc-600">
                          {tech.description.length > 50
                            ? tech.description.substring(0, 50) + "..."
                            : tech.description}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          tech.active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {tech.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="py-3">{tech._count.sales}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleEdit(tech)}
                        className="mr-2 text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(tech)}
                        className="text-red-600 hover:underline"
                        disabled={tech._count.sales > 0}
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
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-bold">Nova Tecnologia</h2>
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
                <label className="mb-1 block text-sm font-medium">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-create"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="active-create" className="text-sm">
                  Ativa
                </label>
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
      {showEditModal && editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-bold">Editar Tecnologia</h2>
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
                <label className="mb-1 block text-sm font-medium">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-edit"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="active-edit" className="text-sm">
                  Ativa
                </label>
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
                    setEditingTech(null);
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
