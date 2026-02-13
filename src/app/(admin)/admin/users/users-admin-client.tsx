"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  passkeyEnabled: boolean;
  createdAt: string;
  _count: {
    visits: number;
    sales: number;
    tasks: number;
  };
}

interface UsersAdminClientProps {
  initialUsers: User[];
  initialTotal: number;
}

export default function UsersAdminClient({
  initialUsers,
  initialTotal,
}: UsersAdminClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES" as "ADMIN" | "SALES",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const limit = 20;

  // Buscar usuários
  const fetchUsers = async (pageNum: number = page, role: string = roleFilter) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        ...(role && { role }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotal(data.pagination.total);
      } else {
        setError("Erro ao buscar usuários");
      }
    } catch (err) {
      setError("Erro ao buscar usuários");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de criação
  const handleCreate = () => {
    setFormData({ name: "", email: "", password: "", role: "SALES" });
    setError("");
    setShowCreateModal(true);
  };

  // Abrir modal de edição
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role as "ADMIN" | "SALES",
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
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setSuccessMessage("Usuário criado com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao criar usuário");
      }
    } catch (err) {
      setError("Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  // Submeter edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setError("");

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingUser(null);
        setSuccessMessage("Usuário atualizado com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao atualizar usuário");
      }
    } catch (err) {
      setError("Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  // Remover usuário
  const handleDelete = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja remover "${user.name || user.email}"?`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage("Usuário removido com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || "Erro ao remover usuário");
      }
    } catch (err) {
      setError("Erro ao remover usuário");
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
      fetchUsers(newPage);
    }
  };
  const handleNextPage = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      fetchUsers(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Novo Usuário
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

      {/* Filtro por role */}
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <label className="mb-2 block text-sm font-medium">Filtrar por Role:</label>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
            fetchUsers(1, e.target.value);
          }}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Todos</option>
          <option value="ADMIN">Admin</option>
          <option value="SALES">Comercial</option>
        </select>
      </div>

      {/* Lista de usuários */}
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {loading && <p className="text-center text-zinc-600">A carregar...</p>}

        {!loading && users.length === 0 && (
          <p className="text-center text-zinc-600">Nenhum usuário encontrado.</p>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="pb-2 text-left font-medium">Nome</th>
                  <th className="pb-2 text-left font-medium">Email</th>
                  <th className="pb-2 text-left font-medium">Role</th>
                  <th className="pb-2 text-left font-medium">Visitas</th>
                  <th className="pb-2 text-left font-medium">Vendas</th>
                  <th className="pb-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 font-medium">{user.name || "—"}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">{user._count.visits}</td>
                    <td className="py-3">{user._count.sales}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleEdit(user)}
                        className="mr-2 text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:underline"
                        disabled={
                          user._count.visits > 0 ||
                          user._count.sales > 0 ||
                          user._count.tasks > 0
                        }
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

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Página {page} de {totalPages} ({total} usuários)
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
            <h2 className="mb-4 text-xl font-bold">Novo Usuário</h2>
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
                <label className="mb-1 block text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as "ADMIN" | "SALES" })
                  }
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="SALES">Comercial</option>
                  <option value="ADMIN">Admin</option>
                </select>
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
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-bold">Editar Usuário</h2>
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
                <label className="mb-1 block text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nova Password (deixe em branco para não alterar)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as "ADMIN" | "SALES" })
                  }
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="SALES">Comercial</option>
                  <option value="ADMIN">Admin</option>
                </select>
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
                    setEditingUser(null);
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
