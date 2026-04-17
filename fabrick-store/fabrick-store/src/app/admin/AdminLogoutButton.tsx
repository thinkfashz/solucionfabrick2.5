'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Proceed with redirect even if the network request fails
    } finally {
      setLoading(false);
      router.replace('/admin/login');
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 text-xs uppercase tracking-widest transition-all disabled:opacity-40"
    >
      {loading ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  );
}
