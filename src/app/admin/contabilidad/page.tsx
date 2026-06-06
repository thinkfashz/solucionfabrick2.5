"use client";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Trash2,
  CalendarDays,
  FileText,
  BarChart2,
} from "lucide-react";

type Estado = "pendiente" | "declarado" | "pagado";

type F29 = {
  id: number;
  periodo: string;
  ventas_afectas: number;
  ventas_exentas: number;
  ventas_exportaciones: number;
  debito_fiscal: number;
  compras_afectas: number;
  compras_exentas: number;
  credito_fiscal: number;
  remanente_anterior: number;
  credito_total: number;
  iva_neto: number;
  remanente_siguiente: number;
  ppm_tasa: number;
  ppm_base: number;
  ppm_monto: number;
  otros_creditos: number;
  total_pagar: number;
  estado: Estado;
  fecha_declaracion: string | null;
  notas: string;
};

type FormData = {
  periodo: string;
  ventas_afectas: string;
  ventas_exentas: string;
  ventas_exportaciones: string;
  debito_fiscal: string;
  compras_afectas: string;
  compras_exentas: string;
  credito_fiscal: string;
  remanente_anterior: string;
  credito_total: string;
  iva_neto: string;
  remanente_siguiente: string;
  ppm_tasa: string;
  ppm_base: string;
  ppm_monto: string;
  otros_creditos: string;
  total_pagar: string;
  estado: Estado;
  fecha_declaracion: string;
  notas: string;
};

type ActiveTab = "calendar" | "historial" | "form";

const EMPTY_FORM: FormData = {
  periodo: "",
  ventas_afectas: "0",
  ventas_exentas: "0",
  ventas_exportaciones: "0",
  debito_fiscal: "0",
  compras_afectas: "0",
  compras_exentas: "0",
  credito_fiscal: "0",
  remanente_anterior: "0",
  credito_total: "0",
  iva_neto: "0",
  remanente_siguiente: "0",
  ppm_tasa: "2.50",
  ppm_base: "0",
  ppm_monto: "0",
  otros_creditos: "0",
  total_pagar: "0",
  estado: "pendiente",
  fecha_declaracion: "",
  notas: "",
};

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTH_SHORT = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
];

const ESTADO_STYLE: Record<Estado, string> = {
  pendiente: "bg-red-900/40 text-red-300",
  declarado: "bg-blue-900/40 text-blue-300",
  pagado: "bg-green-900/40 text-green-300",
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  declarado: "Declarado",
  pagado: "Pagado",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function n(s: string): number {
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function calcForm(f: FormData): FormData {
  const debito_fiscal = Math.round(n(f.ventas_afectas) * 0.19);
  const credito_fiscal = Math.round(n(f.compras_afectas) * 0.19);
  const credito_total = credito_fiscal + n(f.remanente_anterior);
  const iva_neto = Math.max(0, debito_fiscal - credito_total);
  const remanente_siguiente = Math.max(0, credito_total - debito_fiscal);
  const ppm_monto = Math.round((n(f.ppm_base) * n(f.ppm_tasa)) / 100);
  const total_pagar = Math.max(0, iva_neto + ppm_monto - n(f.otros_creditos));
  return {
    ...f,
    debito_fiscal: String(debito_fiscal),
    credito_fiscal: String(credito_fiscal),
    credito_total: String(credito_total),
    iva_neto: String(iva_neto),
    remanente_siguiente: String(remanente_siguiente),
    ppm_monto: String(ppm_monto),
    total_pagar: String(total_pagar),
  };
}

function setField(
  key: keyof FormData,
  value: string,
  setForm: React.Dispatch<React.SetStateAction<FormData>>
) {
  setForm((prev) => calcForm({ ...prev, [key]: value }));
}

function parseDeclaracion(r: Record<string, unknown>): F29 {
  return {
    id: Number(r.id),
    periodo: String(r.periodo ?? ""),
    ventas_afectas: Number(r.ventas_afectas ?? 0),
    ventas_exentas: Number(r.ventas_exentas ?? 0),
    ventas_exportaciones: Number(r.ventas_exportaciones ?? 0),
    debito_fiscal: Number(r.debito_fiscal ?? 0),
    compras_afectas: Number(r.compras_afectas ?? 0),
    compras_exentas: Number(r.compras_exentas ?? 0),
    credito_fiscal: Number(r.credito_fiscal ?? 0),
    remanente_anterior: Number(r.remanente_anterior ?? 0),
    credito_total: Number(r.credito_total ?? 0),
    iva_neto: Number(r.iva_neto ?? 0),
    remanente_siguiente: Number(r.remanente_siguiente ?? 0),
    ppm_tasa: Number(r.ppm_tasa ?? 2.5),
    ppm_base: Number(r.ppm_base ?? 0),
    ppm_monto: Number(r.ppm_monto ?? 0),
    otros_creditos: Number(r.otros_creditos ?? 0),
    total_pagar: Number(r.total_pagar ?? 0),
    estado: (r.estado as Estado) ?? "pendiente",
    fecha_declaracion: r.fecha_declaracion ? String(r.fecha_declaracion) : null,
    notas: String(r.notas ?? ""),
  };
}

function f29ToForm(d: F29): FormData {
  return {
    periodo: d.periodo,
    ventas_afectas: String(d.ventas_afectas),
    ventas_exentas: String(d.ventas_exentas),
    ventas_exportaciones: String(d.ventas_exportaciones),
    debito_fiscal: String(d.debito_fiscal),
    compras_afectas: String(d.compras_afectas),
    compras_exentas: String(d.compras_exentas),
    credito_fiscal: String(d.credito_fiscal),
    remanente_anterior: String(d.remanente_anterior),
    credito_total: String(d.credito_total),
    iva_neto: String(d.iva_neto),
    remanente_siguiente: String(d.remanente_siguiente),
    ppm_tasa: String(d.ppm_tasa),
    ppm_base: String(d.ppm_base),
    ppm_monto: String(d.ppm_monto),
    otros_creditos: String(d.otros_creditos),
    total_pagar: String(d.total_pagar),
    estado: d.estado,
    fecha_declaracion: d.fecha_declaracion ?? "",
    notas: d.notas,
  };
}

function NumInput({
  label,
  value,
  onChange,
  readOnly = false,
  highlight = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-zinc-500">{label}</label>
      <input
        type={readOnly ? "text" : "number"}
        value={
          readOnly
            ? fmt.format(n(value))
            : value
        }
        readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
        className={cn(
          "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition",
          readOnly
            ? highlight
              ? "border-amber-400/30 bg-amber-400/5 text-amber-400 font-semibold cursor-default"
              : "border-white/5 bg-zinc-900/50 text-zinc-400 cursor-default"
            : "border-white/10 bg-black/30 text-white placeholder-zinc-700 focus:border-amber-400/50 focus:bg-black/50 focus:ring-1 focus:ring-amber-400/20"
        )}
      />
    </div>
  );
}

export default function ContabilidadPage() {
  const [declaraciones, setDeclaraciones] = useState<F29[]>([]);
  const [tableExists, setTableExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("calendar");
  const [setupLoading, setSetupLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const today = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/f29");
      const json = (await res.json()) as {
        declaraciones?: Record<string, unknown>[];
        table_exists?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Error al cargar");
      setTableExists(json.table_exists ?? true);
      setDeclaraciones((json.declaraciones ?? []).map(parseDeclaracion));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (periodo: string, existing?: F29) => {
    setSelectedPeriodo(periodo);
    if (existing) {
      setForm(f29ToForm(existing));
    } else {
      setForm(calcForm({ ...EMPTY_FORM, periodo }));
    }
    setActiveTab("form");
  };

  const handleSave = async () => {
    if (!form.periodo) return;
    setSaving(true);
    try {
      const payload = {
        periodo: form.periodo,
        ventas_afectas: n(form.ventas_afectas),
        ventas_exentas: n(form.ventas_exentas),
        ventas_exportaciones: n(form.ventas_exportaciones),
        debito_fiscal: n(form.debito_fiscal),
        compras_afectas: n(form.compras_afectas),
        compras_exentas: n(form.compras_exentas),
        credito_fiscal: n(form.credito_fiscal),
        remanente_anterior: n(form.remanente_anterior),
        credito_total: n(form.credito_total),
        iva_neto: n(form.iva_neto),
        remanente_siguiente: n(form.remanente_siguiente),
        ppm_tasa: n(form.ppm_tasa),
        ppm_base: n(form.ppm_base),
        ppm_monto: n(form.ppm_monto),
        otros_creditos: n(form.otros_creditos),
        total_pagar: n(form.total_pagar),
        estado: form.estado,
        fecha_declaracion: form.fecha_declaracion || null,
        notas: form.notas,
      };
      const res = await fetch("/api/admin/f29", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al guardar");
      }
      await load();
      setActiveTab("historial");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta declaración?")) return;
    try {
      const res = await fetch(`/api/admin/f29?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al eliminar");
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/admin/f29", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Error al crear tabla");
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSetupLoading(false);
    }
  };

  // KPIs
  const totalVentas = declaraciones.reduce((s, d) => s + d.ventas_afectas, 0);
  const totalIva = declaraciones.reduce((s, d) => s + d.iva_neto, 0);
  const totalPpm = declaraciones.reduce((s, d) => s + d.ppm_monto, 0);
  const totalPagar = declaraciones.reduce((s, d) => s + d.total_pagar, 0);

  // Month data for calendar
  const monthData = MONTH_NAMES.map((name, idx) => {
    const mm = String(idx + 1).padStart(2, "0");
    const periodo = `${currentYear}-${mm}`;
    const decl = declaraciones.find((d) => d.periodo === periodo);
    // Vencimiento: 12th of next month
    const vencDate = new Date(currentYear, idx + 1, 12);
    const daysToVenc = Math.ceil(
      (vencDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isUrgent =
      daysToVenc <= 7 &&
      daysToVenc >= 0 &&
      (!decl || decl.estado === "pendiente");
    const isFuture = vencDate > today;
    return { name, short: MONTH_SHORT[idx], periodo, decl, vencDate, daysToVenc, isUrgent, isFuture };
  });

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "calendar", label: "Calendario", icon: <CalendarDays className="size-4" /> },
    { id: "form", label: "Formulario F29", icon: <FileText className="size-4" /> },
    { id: "historial", label: "Historial", icon: <BarChart2 className="size-4" /> },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/70 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_40%,rgba(251,191,36,0.08))]" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">SII · Declaraciones</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Contabilidad F29</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">Declaraciones mensuales de IVA y PPM — {currentYear}</p>
          </div>
        </div>
      </div>

      {/* Setup banner */}
      {!tableExists && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Base de datos no configurada</p>
              <p className="text-xs text-amber-400/70">Haz clic en &apos;Crear tabla&apos; para empezar a registrar declaraciones.</p>
            </div>
          </div>
          <button
            onClick={handleSetup}
            disabled={setupLoading}
            className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-black shadow-[0_2px_12px_rgba(251,191,36,0.35)] transition hover:opacity-90 disabled:opacity-60"
          >
            {setupLoading ? "Creando…" : "Crear tabla"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-400/12 to-transparent p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300 mb-2">Ventas acumuladas</p>
          <p className="text-2xl font-black text-white truncate">{fmt.format(totalVentas)}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/12 to-transparent p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 mb-2">IVA neto pagado</p>
          <p className="text-2xl font-black text-white truncate">{fmt.format(totalIva)}</p>
        </div>
        <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-400/12 to-transparent p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300 mb-2">PPM acumulado</p>
          <p className="text-2xl font-black text-white truncate">{fmt.format(totalPpm)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/12 to-transparent p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300 mb-2">Total a pagar</p>
          <p className="text-2xl font-black text-white truncate">{fmt.format(totalPagar)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-zinc-900/60 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-semibold transition-all duration-150",
              activeTab === t.id
                ? "bg-amber-400 text-black shadow-[0_2px_12px_rgba(251,191,36,0.4)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      )}

      {/* CALENDAR TAB */}
      {!loading && activeTab === "calendar" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {monthData.map((m) => {
            const hasDecl = !!m.decl;
            const estado = m.decl?.estado;
            const isSelected = m.periodo === selectedPeriodo;

            let cardClass = "border-white/8 bg-zinc-900/20 opacity-50";
            if (hasDecl) {
              if (estado === "pagado")
                cardClass = "border-green-500/30 bg-green-900/10";
              else if (estado === "declarado")
                cardClass = "border-blue-500/30 bg-blue-900/10";
              else cardClass = "border-red-500/30 bg-red-900/10";
            } else if (!m.isFuture) {
              cardClass = "border-red-500/30 bg-red-900/10";
            } else {
              cardClass = "border-white/10 bg-zinc-900/40";
            }

            const vencStr = `12 ${MONTH_SHORT[(m.vencDate.getMonth())]}`;

            return (
              <button
                key={m.periodo}
                onClick={() => openForm(m.periodo, m.decl)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] hover:brightness-110 min-h-[100px]",
                  cardClass,
                  isSelected && "ring-2 ring-amber-400/50"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-lg font-black text-white">{m.short}</p>
                  {m.isUrgent && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                      Urgente
                    </span>
                  )}
                </div>
                {hasDecl && m.decl && (
                  <p className="text-xs font-semibold text-amber-400 mb-2">
                    {fmt.format(m.decl.total_pagar)}
                  </p>
                )}
                <div className="flex items-center justify-between gap-1">
                  {hasDecl && estado ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        estado === "pagado"
                          ? "bg-green-900/50 text-green-300 border-green-500/30"
                          : estado === "declarado"
                          ? "bg-blue-900/50 text-blue-300 border-blue-500/30"
                          : "bg-red-900/50 text-red-300 border-red-500/30"
                      )}
                    >
                      {ESTADO_LABEL[estado]}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-600">Sin declarar</span>
                  )}
                  <span className="text-[10px] font-medium text-zinc-500 bg-white/5 rounded-full px-1.5 py-0.5">
                    Vence {vencStr}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FORM TAB */}
      {!loading && activeTab === "form" && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-6 space-y-6">
          {/* Período */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">Período</p>
            <div className="max-w-xs">
              <label className="mb-1.5 block text-xs text-zinc-500">
                Período (AAAA-MM)
              </label>
              <input
                type="text"
                value={form.periodo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodo: e.target.value }))
                }
                placeholder="2025-01"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-700 outline-none transition focus:border-amber-400/50 focus:bg-black/50 focus:ring-1 focus:ring-amber-400/20"
              />
            </div>
          </div>

          {/* Ventas */}
          <div>
            <div className="mb-3 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Ventas y Servicios Prestados</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumInput
                label="Ventas afectas al IVA"
                value={form.ventas_afectas}
                onChange={(v) => setField("ventas_afectas", v, setForm)}
              />
              <NumInput
                label="Ventas exentas / no afectas"
                value={form.ventas_exentas}
                onChange={(v) => setField("ventas_exentas", v, setForm)}
              />
              <NumInput
                label="Exportaciones (monto FOB)"
                value={form.ventas_exportaciones}
                onChange={(v) => setField("ventas_exportaciones", v, setForm)}
              />
              <NumInput
                label="Débito fiscal (19%)"
                value={form.debito_fiscal}
                readOnly
                highlight
              />
            </div>
          </div>

          {/* Compras */}
          <div>
            <div className="mb-3 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Compras y Servicios Utilizados</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumInput
                label="Compras afectas al IVA"
                value={form.compras_afectas}
                onChange={(v) => setField("compras_afectas", v, setForm)}
              />
              <NumInput
                label="Compras exentas"
                value={form.compras_exentas}
                onChange={(v) => setField("compras_exentas", v, setForm)}
              />
              <NumInput
                label="Crédito fiscal (19%)"
                value={form.credito_fiscal}
                readOnly
                highlight
              />
              <NumInput
                label="Remanente crédito mes anterior"
                value={form.remanente_anterior}
                onChange={(v) => setField("remanente_anterior", v, setForm)}
              />
              <NumInput
                label="Crédito fiscal total"
                value={form.credito_total}
                readOnly
                highlight
              />
            </div>
          </div>

          {/* Resultado IVA */}
          <div>
            <div className="mb-3 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Resultado IVA</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <p className="text-xs text-zinc-500 mb-1">IVA a pagar</p>
                <p className="text-2xl font-bold text-amber-400">
                  {fmt.format(n(form.iva_neto))}
                </p>
              </div>
              {n(form.remanente_siguiente) > 0 && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-900/10 p-4">
                  <p className="text-xs text-zinc-500 mb-1">
                    Remanente crédito siguiente mes
                  </p>
                  <p className="text-2xl font-bold text-blue-400">
                    {fmt.format(n(form.remanente_siguiente))}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PPM */}
          <div>
            <div className="mb-3 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">PPM — Pagos Provisionales Mensuales</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumInput
                label="Tasa PPM (%)"
                value={form.ppm_tasa}
                onChange={(v) => setField("ppm_tasa", v, setForm)}
              />
              <NumInput
                label="Base imponible PPM"
                value={form.ppm_base}
                onChange={(v) => setField("ppm_base", v, setForm)}
              />
              <NumInput
                label="PPM determinado"
                value={form.ppm_monto}
                readOnly
                highlight
              />
            </div>
          </div>

          {/* Otros créditos */}
          <div>
            <div className="mb-3 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Otros créditos y rebajas</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="max-w-xs">
              <NumInput
                label="Otros créditos"
                value={form.otros_creditos}
                onChange={(v) => setField("otros_creditos", v, setForm)}
              />
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(251,191,36,0.08)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                Total a pagar
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                IVA neto + PPM − otros créditos
              </p>
            </div>
            <p className="text-3xl font-black text-amber-400">
              {fmt.format(n(form.total_pagar))}
            </p>
          </div>

          {/* Estado */}
          <div>
            <div className="mb-3 mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Estado de declaración</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estado: e.target.value as Estado,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/50 focus:bg-black/50 focus:ring-1 focus:ring-amber-400/20"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="declarado">Declarado</option>
                  <option value="pagado">Pagado</option>
                </select>
              </div>
              {(form.estado === "declarado" || form.estado === "pagado") && (
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Fecha declaración
                  </label>
                  <input
                    type="date"
                    value={form.fecha_declaracion}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fecha_declaracion: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/50 focus:bg-black/50 focus:ring-1 focus:ring-amber-400/20"
                  />
                </div>
              )}
              <div className={form.estado === "pendiente" ? "sm:col-span-2" : ""}>
                <label className="mb-1.5 block text-xs text-zinc-500">
                  Notas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notas: e.target.value }))
                  }
                  rows={2}
                  placeholder="Observaciones…"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-700 outline-none transition focus:border-amber-400/50 focus:bg-black/50 focus:ring-1 focus:ring-amber-400/20 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <button
              onClick={() => setActiveTab("calendar")}
              className="rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.periodo}
              className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-black shadow-[0_2px_12px_rgba(251,191,36,0.35)] disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saving ? "Guardando…" : "Guardar declaración"}
            </button>
          </div>
        </div>
      )}

      {/* HISTORIAL TAB */}
      {!loading && activeTab === "historial" && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
          {declaraciones.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-sm">
              No hay declaraciones aún. Usa el calendario para crear una.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5">
                    Período
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5 hidden sm:table-cell">
                    Ventas
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5 hidden md:table-cell">
                    IVA débito
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5 hidden md:table-cell">
                    Crédito fiscal
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5">
                    Total pagar
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5 hidden sm:table-cell">
                    Estado
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 px-5 py-3.5">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {declaraciones.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={cn(
                      "border-b border-white/[0.05] transition-colors hover:bg-white/[0.04]",
                      idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                    )}
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold text-white">
                      {d.periodo}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-zinc-300 hidden sm:table-cell">
                      {fmt.format(d.ventas_afectas)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-zinc-300 hidden md:table-cell">
                      {fmt.format(d.debito_fiscal)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-zinc-300 hidden md:table-cell">
                      {fmt.format(d.credito_fiscal)}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-right text-amber-400">
                      {fmt.format(d.total_pagar)}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold border",
                          d.estado === "pagado"
                            ? "bg-green-900/50 text-green-300 border-green-500/30"
                            : d.estado === "declarado"
                            ? "bg-blue-900/50 text-blue-300 border-blue-500/30"
                            : "bg-red-900/50 text-red-300 border-red-500/30"
                        )}
                      >
                        {ESTADO_LABEL[d.estado]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openForm(d.periodo, d)}
                          className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
