const fs = require('fs');

let content = fs.readFileSync('src/app/admin/facturas/page.tsx', 'utf-8');

const searchBlock = `      {billingStatus && !billingStatus.configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Modo simulado ({billingStatus.provider})</p>
            <p className="text-xs text-yellow-200/80">
              Configurá <code>BILLING_PROVIDER=haulmer</code>, <code>BILLING_API_KEY</code> y{' '}
              <code>BILLING_RUT_EMISOR</code> en Vercel para emitir DTE reales contra el SII.
            </p>
          </div>
        </div>
      )}

      {billingStatus?.configured && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <p>
            <strong>Haulmer activo</strong> — las emisiones van contra el SII en tiempo real.
          </p>
        </div>
      )}

      {/* Emit form */}
      <EmitForm onSuccess={() => void load()} />

      {error && (
        <div className="my-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
          <p className="mt-1 text-xs text-red-200/70">
            ¿Tabla <code>invoices</code> no creada? Andá a{' '}
            <Link href="/admin/setup" className="underline">/admin/setup</Link>.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Folio</th>
              <th className="px-3 py-2 text-left">RUT receptor</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">SII</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">Cargando…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  Aún no hay facturas emitidas.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={\`border-t border-zinc-800/60 \${r.voided ? 'opacity-50' : ''}\`}
                >
                  <td className="px-3 py-2">{DTE_NAMES[r.dte_type] ?? r.dte_type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.folio ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.rut_receptor ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCLP(Number(r.total ?? 0))}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={\`rounded-full px-2 py-0.5 text-[10px] font-semibold \${
                        r.voided
                          ? 'bg-red-500/15 text-red-300'
                          : r.sii_status === 'accepted' || r.sii_status === 'accepted_mock'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-yellow-500/15 text-yellow-300'
                      }\`}
                    >
                      {r.voided ? 'Anulado' : r.sii_status === 'accepted_mock' ? 'Aceptado (Mock)' : (r.sii_status ?? 'Pendiente')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      {r.pdf_url && (
                        <Link
                          href={\`/api/invoices/\${r.id}/pdf\${r.pdf_token ? \`?token=\${encodeURIComponent(r.pdf_token)}\` : ''}\`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-yellow-400 hover:underline"
                        >
                          PDF
                        </Link>
                      )}
                      {!r.voided && r.dte_type !== 61 && (
                        <VoidButton invoice={r} onVoided={() => void load()} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}`;

const replaceBlock = `      {billingStatus && !billingStatus.configured && (
        <div className="mb-4 mt-4 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Modo simulado ({billingStatus.provider})</p>
            <p className="text-xs text-yellow-200/80">
              Configurá <code>BILLING_PROVIDER=haulmer</code>, <code>BILLING_API_KEY</code> y{' '}
              <code>BILLING_RUT_EMISOR</code> en Vercel para emitir DTE reales contra el SII.
            </p>
          </div>
        </div>
      )}

      {billingStatus?.configured && (
        <div className="mb-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <p>
            Conectado a {billingStatus.provider}. Los DTEs emitidos se informan al SII.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
          <p className="mt-1 text-xs text-red-200/70">
            ¿Tabla <code>invoices</code> no creada? Andá a{' '}
            <Link href="/admin/setup" className="underline">/admin/setup</Link>.
          </p>
        </div>
      )}

      <AdminBaseGrid cols="2">
        <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6 flex flex-col h-full overflow-hidden w-full max-w-full">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
                 <Receipt className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white leading-none">Registro de Ventas (Emitidos)</h2>
                 <p className="text-xs text-zinc-400 mt-1">Facturas y boletas generadas desde tu tienda</p>
              </div>
           </div>

           <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 w-full max-w-full">
             <table className="w-full text-sm min-w-[600px]">
               <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400 border-b border-white/10">
                 <tr>
                   <th className="px-4 py-3 text-left">Tipo</th>
                   <th className="px-4 py-3 text-left">RUT Receptor</th>
                   <th className="px-4 py-3 text-right">Total</th>
                   <th className="px-4 py-3 text-left">Estado SII</th>
                   <th className="px-4 py-3 text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {loading ? (
                   <tr>
                     <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Sincronizando SII...</td>
                   </tr>
                 ) : rows.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                       Aún no hay facturas emitidas este mes.
                     </td>
                   </tr>
                 ) : (
                   rows.map((r) => (
                     <tr key={r.id} className={\`\${r.voided ? 'opacity-50' : 'hover:bg-white/[0.02]'} transition-colors\`}>
                       <td className="px-4 py-3">
                         <p className="font-bold text-zinc-200">{DTE_NAMES[r.dte_type] ?? r.dte_type}</p>
                         <p className="font-mono text-[10px] text-zinc-500">Folio {r.folio ?? '—'}</p>
                       </td>
                       <td className="px-4 py-3 font-mono text-xs text-zinc-300">{r.rut_receptor ?? '—'}</td>
                       <td className="px-4 py-3 text-right font-mono text-yellow-400">
                         {formatCLP(Number(r.total ?? 0))}
                       </td>
                       <td className="px-4 py-3">
                         <span
                           className={\`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider \${
                             r.voided
                               ? 'bg-red-500/15 text-red-300 border border-red-500/20'
                               : r.sii_status === 'accepted' || r.sii_status === 'accepted_mock'
                                 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                 : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20'
                           }\`}
                         >
                           {r.voided ? 'Anulado' : r.sii_status === 'accepted_mock' ? 'Aceptado' : (r.sii_status ?? 'Pendiente')}
                         </span>
                       </td>
                       <td className="px-4 py-3 text-right">
                         <div className="flex items-center justify-end gap-3">
                           {r.pdf_url && (
                             <Link
                               href={\`/api/invoices/\${r.id}/pdf\${r.pdf_token ? \`?token=\${encodeURIComponent(r.pdf_token)}\` : ''}\`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="text-[11px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300"
                             >
                               PDF
                             </Link>
                           )}
                           {!r.voided && r.dte_type !== 61 && (
                             <VoidButton invoice={r} onVoided={() => void load()} />
                           )}
                         </div>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6 flex flex-col h-full overflow-hidden w-full max-w-full">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                   <TrendingDown className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-white leading-none">Registro de Compras (Recibidos)</h2>
                   <p className="text-xs text-zinc-400 mt-1">Gastos declarados en el portal SII (Demo)</p>
                </div>
             </div>
             <span className="rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 border border-cyan-400/30">Auto</span>
           </div>

           <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 w-full max-w-full">
             <table className="w-full text-sm min-w-[500px]">
               <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400 border-b border-white/10">
                 <tr>
                   <th className="px-4 py-3 text-left">Proveedor</th>
                   <th className="px-4 py-3 text-left">Fecha</th>
                   <th className="px-4 py-3 text-right">Monto</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {gastosMock.map((g) => (
                   <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                     <td className="px-4 py-3">
                       <p className="font-bold text-zinc-200">{g.proveedor}</p>
                       <div className="flex items-center gap-2 mt-0.5">
                         <span className="font-mono text-[10px] text-zinc-500">{g.rut}</span>
                         <span className="text-[9px] uppercase tracking-wider text-cyan-400/70 border border-cyan-400/20 rounded px-1">{g.tipo}</span>
                       </div>
                     </td>
                     <td className="px-4 py-3 text-xs text-zinc-400">{g.fecha}</td>
                     <td className="px-4 py-3 text-right font-mono text-cyan-300 font-medium">
                       {formatCLP(g.monto)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </AdminBaseGrid>

    </AdminBasePage>
  );
}`;

content = content.replace(searchBlock, replaceBlock);
fs.writeFileSync('src/app/admin/facturas/page.tsx', content, 'utf-8');
