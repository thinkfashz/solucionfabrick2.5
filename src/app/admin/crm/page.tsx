'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Handshake, Loader2, Pencil, Plus, Trash2, TrendingUp, Users } from 'lucide-react';
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Stage = 'Contacto inicial' | 'Calificación' | 'Propuesta' | 'Negociación' | 'Cerrado';
type Lead = { id:number; name:string; contact:string; email:string; phone:string; company:string; value:number; stage:Stage; probability:number; notes:string; next_action:string; created_at:string; updated_at:string };
type FormData = { name:string; contact:string; email:string; phone:string; company:string; value:string; stage:Stage; probability:string; next_action:string; notes:string };

const STAGES: Stage[] = ['Contacto inicial','Calificación','Propuesta','Negociación','Cerrado'];
const EMPTY_FORM: FormData = { name:'', contact:'', email:'', phone:'', company:'', value:'0', stage:'Contacto inicial', probability:'20', next_action:'', notes:'' };
const fmt = new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});

function nextStage(stage: Stage) { const i=STAGES.indexOf(stage); return i>=0 && i<STAGES.length-1 ? STAGES[i+1] : null; }
function stageTone(stage: Stage) {
  if (stage==='Cerrado') return 'bg-emerald-50 text-emerald-800';
  if (stage==='Negociación') return 'bg-orange-50 text-orange-800';
  if (stage==='Propuesta') return 'bg-amber-50 text-amber-800';
  if (stage==='Calificación') return 'bg-sky-50 text-sky-800';
  return 'bg-black/5 text-[#716b60]';
}

function Field({label,value,onChange,type='text',placeholder=''}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string}){
  return <label className="grid gap-1.5 text-xs font-bold text-[#716b60]"><span>{label}</span><input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#171612] outline-none focus:border-[#c77a00]"/></label>;
}

export default function CRMPage(){
  const [leads,setLeads]=useState<Lead[]>([]);
  const [tableExists,setTableExists]=useState(true);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [filter,setFilter]=useState<string>('Todos');
  const [modal,setModal]=useState(false);
  const [editLead,setEditLead]=useState<Lead|null>(null);
  const [saving,setSaving]=useState(false);
  const [setupLoading,setSetupLoading]=useState(false);
  const [form,setForm]=useState<FormData>(EMPTY_FORM);

  const load=useCallback(async()=>{
    setLoading(true); setError(null);
    try{
      const res=await fetch('/api/admin/crm',{cache:'no-store'}); const json=await res.json();
      if(!res.ok) throw new Error(json.error||'Error al cargar leads');
      setTableExists(json.table_exists??true);
      setLeads((json.leads||[]).map((l:Record<string,unknown>)=>({id:Number(l.id),name:String(l.name||''),contact:String(l.contact||''),email:String(l.email||''),phone:String(l.phone||''),company:String(l.company||''),value:Number(l.value||0),stage:(l.stage as Stage)||'Contacto inicial',probability:Number(l.probability||20),notes:String(l.notes||''),next_action:String(l.next_action||''),created_at:String(l.created_at||''),updated_at:String(l.updated_at||'')})));
    }catch(err){setError(err instanceof Error?err.message:'Error desconocido');}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  function openNew(){setEditLead(null);setForm(EMPTY_FORM);setModal(true);}
  function openEdit(lead:Lead){setEditLead(lead);setForm({name:lead.name,contact:lead.contact,email:lead.email,phone:lead.phone,company:lead.company,value:String(lead.value),stage:lead.stage,probability:String(lead.probability),next_action:lead.next_action,notes:lead.notes});setModal(true);}
  async function save(){if(!form.name.trim())return;setSaving(true);try{const payload={name:form.name,contact:form.contact,email:form.email,phone:form.phone,company:form.company,value:Number(form.value),stage:form.stage,probability:Number(form.probability),next_action:form.next_action,notes:form.notes};const res=await fetch('/api/admin/crm',{method:editLead?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editLead?{id:editLead.id,...payload}:payload)});const j=await res.json().catch(()=>({}));if(!res.ok)throw new Error(j.error||'Error al guardar');setModal(false);await load();}catch(err){setError(err instanceof Error?err.message:'Error al guardar');}finally{setSaving(false);}}
  async function remove(id:number){if(!confirm('¿Eliminar este lead?'))return;const res=await fetch(`/api/admin/crm?id=${id}`,{method:'DELETE'});if(!res.ok){const j=await res.json().catch(()=>({}));setError(j.error||'Error al eliminar');return;}await load();}
  async function advance(lead:Lead){const stage=nextStage(lead.stage);if(!stage)return;const res=await fetch('/api/admin/crm',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:lead.id,stage})});if(!res.ok){const j=await res.json().catch(()=>({}));setError(j.error||'Error al avanzar etapa');return;}await load();}
  async function setup(){setSetupLoading(true);try{const res=await fetch('/api/admin/crm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'setup'})});if(!res.ok){const j=await res.json();throw new Error(j.error||'Error al crear tabla');}await load();}catch(err){setError(err instanceof Error?err.message:'Error al crear tabla');}finally{setSetupLoading(false);}}

  const filtered=filter==='Todos'?leads:leads.filter((l)=>l.stage===filter);
  const totalValue=useMemo(()=>leads.reduce((s,l)=>s+l.value,0),[leads]);
  const weighted=useMemo(()=>leads.reduce((s,l)=>s+(l.value*l.probability)/100,0),[leads]);
  const negotiating=leads.filter((l)=>l.stage==='Negociación').length;

  return <AdminPage>
    <AdminPageHeader eyebrow="Ventas & clientes" title="CRM & Pipeline" description="Oportunidades, valor esperado y próxima acción en una sola vista operativa." actions={<button onClick={openNew} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-bold text-[#ffb000]"><Plus className="h-4 w-4"/>Nuevo lead</button>}/>

    {!tableExists?<div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700"/><div><b className="text-sm text-amber-900">CRM pendiente de inicialización</b><p className="mt-1 text-xs text-amber-800/70">Crea la tabla para comenzar a registrar oportunidades.</p></div></div><button onClick={()=>void setup()} disabled={setupLoading} className="h-9 rounded-xl bg-amber-900 px-3 text-xs font-bold text-white">{setupLoading?'Creando…':'Crear tabla'}</button></div>:null}
    {error?<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>:null}

    <AdminStats>
      <AdminStat label="Leads" value={leads.length} note="Oportunidades activas" icon={Users}/>
      <AdminStat label="Pipeline" value={fmt.format(totalValue)} note="Valor comercial total" icon={TrendingUp}/>
      <AdminStat label="Valor ponderado" value={fmt.format(weighted)} note="Ajustado por probabilidad" icon={TrendingUp}/>
      <AdminStat label="En negociación" value={negotiating} note="Oportunidades avanzadas" icon={Handshake}/>
    </AdminStats>

    <AdminSurface title="Pipeline comercial" description="Filtra por etapa y avanza cada oportunidad sin abandonar la vista." actions={<div className="flex flex-wrap gap-1.5">{['Todos',...STAGES].map((stage)=><button key={stage} onClick={()=>setFilter(stage)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter===stage?'bg-[#171612] text-[#ffb000]':'bg-black/5 text-[#716b60] hover:bg-black/10'}`}>{stage}{stage!=='Todos'?` · ${leads.filter((l)=>l.stage===stage).length}`:''}</button>)}</div>}>
      {loading?<div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c77a00]"/></div>:filtered.length===0?<AdminEmptyState title="Sin oportunidades en esta vista" description={tableExists?'Crea un lead o cambia el filtro para continuar.':'Inicializa primero la tabla del CRM.'} icon={Users}/>:<>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b border-black/10 text-[10px] uppercase tracking-[.14em] text-[#8f887c]"><th className="pb-3">Oportunidad</th><th className="pb-3">Etapa</th><th className="pb-3">Prob.</th><th className="pb-3">Valor</th><th className="pb-3">Próxima acción</th><th className="pb-3 text-right">Acciones</th></tr></thead><tbody>{filtered.map((lead)=><tr key={lead.id} className="border-b border-black/7 last:border-0"><td className="py-4 pr-4"><b className="block text-[#171612]">{lead.name}</b><span className="mt-1 block text-xs text-[#817a6f]">{lead.company||lead.contact||lead.email||'Sin contacto'}</span></td><td className="py-4 pr-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stageTone(lead.stage)}`}>{lead.stage}</span></td><td className="py-4 pr-4 font-bold text-[#171612]">{lead.probability}%</td><td className="py-4 pr-4 font-black text-[#171612]">{fmt.format(lead.value)}</td><td className="max-w-[260px] py-4 pr-4 text-xs text-[#716b60]">{lead.next_action||'Sin próxima acción'}</td><td className="py-4"><div className="flex justify-end gap-1"><button onClick={()=>openEdit(lead)} className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-[#716b60]" title="Editar"><Pencil className="h-4 w-4"/></button>{nextStage(lead.stage)?<button onClick={()=>void advance(lead)} className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-[#9b6a12]" title="Avanzar etapa"><ArrowRight className="h-4 w-4"/></button>:null}<button onClick={()=>void remove(lead.id)} className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-700" title="Eliminar"><Trash2 className="h-4 w-4"/></button></div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 md:hidden">{filtered.map((lead)=><article key={lead.id} className="border-b border-black/10 pb-4 last:border-0"><div className="flex items-start justify-between gap-3"><div><b className="text-sm text-[#171612]">{lead.name}</b><p className="mt-1 text-xs text-[#817a6f]">{lead.company||lead.contact||'Sin contacto'}</p></div><b className="text-sm text-[#171612]">{fmt.format(lead.value)}</b></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stageTone(lead.stage)}`}>{lead.stage}</span><span className="text-[11px] text-[#817a6f]">{lead.probability}% prob.</span></div><p className="mt-3 text-xs text-[#716b60]">Próxima acción: {lead.next_action||'sin definir'}</p><div className="mt-3 flex gap-2"><button onClick={()=>openEdit(lead)} className="h-9 flex-1 rounded-xl border border-black/10 text-xs font-bold">Editar</button>{nextStage(lead.stage)?<button onClick={()=>void advance(lead)} className="h-9 flex-1 rounded-xl bg-[#171612] text-xs font-bold text-[#ffb000]">Avanzar</button>:null}</div></article>)}</div>
      </>}
    </AdminSurface>

    {modal?<div className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"><div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[20px] bg-[#fffaf1] p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b6a12]">CRM</p><h2 className="mt-1 text-2xl font-black text-[#171612]">{editLead?'Editar oportunidad':'Nueva oportunidad'}</h2></div><button onClick={()=>setModal(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-[#716b60]">Cerrar</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Oportunidad *" value={form.name} onChange={(v)=>setForm({...form,name:v})}/><Field label="Empresa" value={form.company} onChange={(v)=>setForm({...form,company:v})}/><Field label="Contacto" value={form.contact} onChange={(v)=>setForm({...form,contact:v})}/><Field label="Email" type="email" value={form.email} onChange={(v)=>setForm({...form,email:v})}/><Field label="Teléfono" value={form.phone} onChange={(v)=>setForm({...form,phone:v})}/><Field label="Valor" type="number" value={form.value} onChange={(v)=>setForm({...form,value:v})}/><label className="grid gap-1.5 text-xs font-bold text-[#716b60]"><span>Etapa</span><select value={form.stage} onChange={(e)=>setForm({...form,stage:e.target.value as Stage})} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-[#171612]">{STAGES.map((s)=><option key={s}>{s}</option>)}</select></label><Field label="Probabilidad %" type="number" value={form.probability} onChange={(v)=>setForm({...form,probability:v})}/><div className="sm:col-span-2"><Field label="Próxima acción" value={form.next_action} onChange={(v)=>setForm({...form,next_action:v})}/></div><label className="grid gap-1.5 text-xs font-bold text-[#716b60] sm:col-span-2"><span>Notas</span><textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} rows={4} className="rounded-xl border border-black/10 bg-white p-3 text-sm text-[#171612] outline-none focus:border-[#c77a00]"/></label></div><div className="mt-6 flex justify-end gap-2 border-t border-black/10 pt-4"><button onClick={()=>setModal(false)} className="h-10 rounded-xl border border-black/10 px-4 text-xs font-bold text-[#716b60]">Cancelar</button><button onClick={()=>void save()} disabled={saving||!form.name.trim()} className="h-10 rounded-xl bg-[#171612] px-4 text-xs font-bold text-[#ffb000] disabled:opacity-50">{saving?'Guardando…':'Guardar oportunidad'}</button></div></div></div>:null}
  </AdminPage>;
}
