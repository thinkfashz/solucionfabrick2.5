"use client";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
  Users,
  TrendingUp,
  DollarSign,
  Handshake,
} from "lucide-react";

type Stage =
  | "Contacto inicial"
  | "Calificación"
  | "Propuesta"
  | "Negociación"
  | "Cerrado";

type Lead = {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  company: string;
  value: number;
  stage: Stage;
  probability: number;
  notes: string;
  next_action: string;
  created_at: string;
  updated_at: string;
};

const STAGES: Stage[] = [
  "Contacto inicial",
  "Calificación",
  "Propuesta",
  "Negociación",
  "Cerrado",
];

const ALL_FILTERS = ["Todos", ...STAGES];

const STAGE_COLOR: Record<Stage, string> = {
  "Contacto inicial": "bg-zinc-800 text-zinc-300",
  Calificación: "bg-blue-900/40 text-blue-300",
  Propuesta: "bg-yellow-900/40 text-yellow-300",
  Negociación: "bg-orange-900/40 text-orange-300",
  Cerrado: "bg-green-900/40 text-green-300",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type FormData = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  company: string;
  value: string;
  stage: Stage;
  probability: string;
  next_action: string;
  notes: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  company: "",
  value: "0",
  stage: "Contacto inicial",
  probability: "20",
  next_action: "",
  notes: "",
};

function nextStage(s: Stage): Stage | null {
  const idx = STAGES.indexOf(s);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
      />
    </div>
  );
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tableExists, setTableExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState("Todos");
  const [saving, setSaving] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crm");
      const json = (await res.json()) as {
        leads?: Record<string, unknown>[];
        table_exists?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Error al cargar leads");
      setTableExists(json.table_exists ?? true);
      setLeads(
        (json.leads ?? []).map((l) => ({
          id: Number(l.id),
          name: String(l.name ?? ""),
          contact: String(l.contact ?? ""),
          email: String(l.email ?? ""),
          phone: String(l.phone ?? ""),
          company: String(l.company ?? ""),
          value: Number(l.value ?? 0),
          stage: (l.stage as Stage) ?? "Contacto inicial",
          probability: Number(l.probability ?? 20),
          notes: String(l.notes ?? ""),
          next_action: String(l.next_action ?? ""),
          created_at: String(l.created_at ?? ""),
          updated_at: String(l.updated_at ?? ""),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const openNew = () => {
    setEditLead(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name,
      contact: lead.contact,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      value: String(lead.value),
      stage: lead.stage,
      probability: String(lead.probability),
      next_action: lead.next_action,
      notes: lead.notes,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        contact: form.contact,
        email: form.email,
        phone: form.phone,
        company: form.company,
        value: Number(form.value),
        stage: form.stage,
        probability: Number(form.probability),
        next_action: form.next_action,
        notes: form.notes,
      };

      let res: Response;
      if (editLead) {
        res = await fetch(`/api/admin/crm`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editLead.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/crm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al guardar");
      }
      setShowModal(false);
      await loadLeads();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este lead?")) return;
    try {
      const res = await fetch(`/api/admin/crm?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al eliminar");
      }
      await loadLeads();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleAdvanceStage = async (lead: Lead) => {
    const next = nextStage(lead.stage);
    if (!next) return;
    try {
      const res = await fetch("/api/admin/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, stage: next }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al actualizar etapa");
      }
      await loadLeads();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al crear tabla");
      }
      await loadLeads();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear tabla");
    } finally {
      setSetupLoading(false);
    }
  };

  const filtered =
    filter === "Todos" ? leads : leads.filter((l) => l.stage === filter);

  const totalValue = leads.reduce((s, l) => s + l.value, 0);
  const weightedValue = leads.reduce(
    (s, l) => s + (l.value * l.probability) / 100,
    0
  );
  const negotiating = leads.filter((l) => l.stage === "Negociación").length;

  const kpis = [
    {
      label: "Total leads",
      value: leads.length.toString(),
      sub: "en pipeline",
      icon: Users,
    },
    {
      label: "Valor total",
      value: fmt.format(totalValue),
      sub: "en pipeline",
      icon: DollarSign,
    },
    {
      label: "Valor ponderado",
      value: fmt.format(weightedValue),
      sub: "por probabilidad",
      icon: TrendingUp,
    },
    {
      label: "En negociación",
      value: negotiating.toString(),
      sub: "leads activos",
      icon: Handshake,
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            CRM & Pipeline de Ventas
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gestiona tus oportunidades comerciales
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Nuevo lead
        </button>
      </div>

      {/* Setup banner */}
      {!tableExists && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-500/30 bg-yellow-900/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 shrink-0 text-yellow-400" />
            <p className="text-sm text-yellow-300">
              Base de datos no configurada. Haz clic en &apos;Crear tabla&apos;
              para empezar.
            </p>
          </div>
          <button
            onClick={handleSetup}
            disabled={setupLoading}
            className="shrink-0 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
          >
            {setupLoading ? "Creando…" : "Crear tabla"}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">
                {k.label}
              </p>
              <k.icon className="size-4 text-zinc-600" />
            </div>
            <p className="text-xl font-bold text-white truncate">{k.value}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === s
                ? "border-amber-400 bg-amber-400/10 text-amber-400"
                : "border-white/20 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {s}
            {s !== "Todos" && (
              <span className="ml-1.5 text-zinc-600">
                {leads.filter((l) => l.stage === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      )}

      {/* Lead list */}
      {!loading && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-sm">
              {tableExists
                ? filter === "Todos"
                  ? "No hay leads. Crea el primero."
                  : `No hay leads en etapa "${filter}"`
                : "Configura la tabla primero."}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                      Empresa / Contacto
                    </th>
                    <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                      Info
                    </th>
                    <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                      Etapa
                    </th>
                    <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                      Probabilidad
                    </th>
                    <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                      Valor
                    </th>
                    <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {filtered.map((lead) => {
                    const ns = nextStage(lead.stage);
                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-white">
                            {lead.name}
                          </p>
                          {lead.company && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {lead.company}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-zinc-400">
                            {lead.contact}
                          </p>
                          {lead.email && (
                            <p className="text-xs text-zinc-600 mt-0.5">
                              {lead.email}
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-xs text-zinc-600">{lead.phone}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              STAGE_COLOR[lead.stage]
                            )}
                          >
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 w-36">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400/70"
                                style={{ width: `${lead.probability}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-400 shrink-0 w-7 text-right">
                              {lead.probability}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-right text-white">
                          {fmt.format(lead.value)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {ns && (
                              <button
                                onClick={() => handleAdvanceStage(lead)}
                                title={`Avanzar a ${ns}`}
                                className="flex items-center gap-1 rounded-lg border border-white/10 bg-transparent px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <ChevronRight className="size-3" />
                                <span className="hidden lg:inline">{ns}</span>
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(lead)}
                              className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile list */}
              <ul className="md:hidden divide-y divide-white/[0.08]">
                {filtered.map((lead) => {
                  const ns = nextStage(lead.stage);
                  return (
                    <li key={lead.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {lead.name}
                          </p>
                          {lead.company && (
                            <p className="text-xs text-zinc-500">{lead.company}</p>
                          )}
                          <p className="text-xs text-zinc-500">{lead.contact}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            STAGE_COLOR[lead.stage]
                          )}
                        >
                          {lead.stage}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400/70"
                            style={{ width: `${lead.probability}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">
                          {lead.probability}%
                        </span>
                        <span className="text-sm font-semibold text-white ml-2">
                          {fmt.format(lead.value)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ns && (
                          <button
                            onClick={() => handleAdvanceStage(lead)}
                            className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:bg-white/5"
                          >
                            <ChevronRight className="size-3" />
                            {ns}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(lead)}
                          className="rounded-lg border border-white/10 p-1.5 text-zinc-400"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="rounded-lg border border-red-500/20 p-1.5 text-red-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">
                {editLead ? "Editar lead" : "Nuevo lead"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Nombre *"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Nombre del lead"
              />
              <InputField
                label="Contacto"
                value={form.contact}
                onChange={(v) => setForm((f) => ({ ...f, contact: v }))}
                placeholder="Persona de contacto"
              />
              <InputField
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                type="email"
                placeholder="email@empresa.cl"
              />
              <InputField
                label="Teléfono"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="+56 9 1234 5678"
              />
              <InputField
                label="Empresa"
                value={form.company}
                onChange={(v) => setForm((f) => ({ ...f, company: v }))}
                placeholder="Nombre de la empresa"
              />
              <InputField
                label="Valor (CLP)"
                value={form.value}
                onChange={(v) => setForm((f) => ({ ...f, value: v }))}
                type="number"
                placeholder="0"
              />

              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">
                  Etapa
                </label>
                <select
                  value={form.stage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stage: e.target.value as Stage }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <InputField
                label="Probabilidad (%)"
                value={form.probability}
                onChange={(v) => setForm((f) => ({ ...f, probability: v }))}
                type="number"
                placeholder="0–100"
              />

              <div className="sm:col-span-2">
                <InputField
                  label="Próxima acción"
                  value={form.next_action}
                  onChange={(v) => setForm((f) => ({ ...f, next_action: v }))}
                  placeholder="¿Qué sigue?"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-zinc-500">
                  Notas
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Observaciones adicionales…"
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50 resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm text-zinc-400 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 transition-opacity hover:opacity-90"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
