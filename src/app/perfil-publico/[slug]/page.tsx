export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">Perfil público</p>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.05em]">{slug}</h1>
        <p className="mt-3 text-sm text-zinc-400">Perfil público seguro para QR y NFC.</p>
      </section>
    </main>
  );
}
