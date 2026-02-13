"use client";

import { useState, useEffect } from "react";

interface Technology {
  id: string;
  name: string;
  description?: string | null;
}

interface SaleFormProps {
  visitId: string;
  companyId?: string;
  companyName?: string;
}

export function SaleForm({ visitId, companyId, companyName }: SaleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedTech, setSelectedTech] = useState("");
  const [valueEuros, setValueEuros] = useState("");
  const [notes, setNotes] = useState("");

  // Carregar tecnologias quando o modal abre
  useEffect(() => {
    if (isOpen && technologies.length === 0) {
      fetch("/api/admin/technologies")
        .then((res) => res.json())
        .then((data) => {
          if (data.technologies) {
            setTechnologies(data.technologies.filter((t: Technology) => t));
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar tecnologias:", err);
          setError("Erro ao carregar tecnologias");
        });
    }
  }, [isOpen, technologies.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar campos obrigatórios
      if (!selectedTech) {
        setError("Selecione uma tecnologia");
        setLoading(false);
        return;
      }

      if (!companyId) {
        setError("Empresa não especificada");
        setLoading(false);
        return;
      }

      // Converter valor para cêntimos (se fornecido)
      const valueCents = valueEuros
        ? Math.round(parseFloat(valueEuros) * 100)
        : undefined;

      // Validar valor se fornecido
      if (valueEuros && (isNaN(valueCents!) || valueCents! < 0)) {
        setError("Valor inválido");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitId,
          companyId,
          technologyId: selectedTech,
          valueCents,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar venda");
      }

      // Sucesso
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        // Reset form
        setSelectedTech("");
        setValueEuros("");
        setNotes("");
        // Recarregar a página para mostrar a nova venda
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Erro ao registar venda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão para abrir modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
      >
        ✅ Fechou Venda
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">💰 Registar Venda</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Empresa (readonly) */}
              {companyName && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    EMPRESA
                  </label>
                  <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                    {companyName}
                  </div>
                </div>
              )}

              {/* Tecnologia */}
              <div>
                <label
                  htmlFor="technology"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  TECNOLOGIA *
                </label>
                <select
                  id="technology"
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  required
                >
                  <option value="">Selecione uma tecnologia</option>
                  {technologies.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <div>
                <label
                  htmlFor="value"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  VALOR (€) - Opcional
                </label>
                <input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valueEuros}
                  onChange={(e) => setValueEuros(e.target.value)}
                  placeholder="Ex: 499.90"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Notas */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  NOTAS - Opcional
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre a venda..."
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                {notes.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {notes.length}/1000 caracteres
                  </p>
                )}
              </div>

              {/* Erro */}
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Sucesso */}
              {success && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  ✅ Venda registada com sucesso!
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "A guardar..." : "Registar Venda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
