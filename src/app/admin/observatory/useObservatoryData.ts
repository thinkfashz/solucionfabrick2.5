'use client';

import { useState, useEffect, useCallback } from 'react';
import { insforge } from '@/lib/insforge';

export type ServiceId = 'vercel' | 'insforge' | 'github' | 'mercadopago' | 'cloudflare';

export interface LatestOrder {
  id: string;
  total: number | null;
  status: string;
  created_at: string;
}

export interface ObservatoryData {
  productosActivos: number;
  pedidosHoy: number;
  leadsHoy: number;
  revenueWeek: number;
  latestOrders: LatestOrder[];
  servicioStatus: Record<ServiceId, { online: boolean; latencyMs: number }>;
  loading: boolean;
  lastUpdated: Date | null;
}

const INITIAL_STATUS: ObservatoryData['servicioStatus'] = {
  vercel: { online: true, latencyMs: 12 },
  insforge: { online: true, latencyMs: 8 },
  github: { online: true, latencyMs: 34 },
  mercadopago: { online: true, latencyMs: 22 },
  cloudflare: { online: true, latencyMs: 5 },
};

export function useObservatoryData(): ObservatoryData {
  const [data, setData] = useState<ObservatoryData>({
    productosActivos: 0,
    pedidosHoy: 0,
    leadsHoy: 0,
    revenueWeek: 0,
    latestOrders: [],
    servicioStatus: INITIAL_STATUS,
    loading: true,
    lastUpdated: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hoyISO = hoy.toISOString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [prod, ped, leads, orders, revenue] = await Promise.allSettled([
        insforge.database
          .from('products')
          .select('id', { count: 'exact', head: true })
          .neq('activo', false),
        insforge.database
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', hoyISO),
        insforge.database
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', hoyISO),
        insforge.database
          .from('orders')
          .select('id,total,status,created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        insforge.database
          .from('orders')
          .select('total')
          .gte('created_at', weekAgo)
          .eq('status', 'pagada'),
      ]);

      const productosActivos =
        prod.status === 'fulfilled' ? (prod.value.count ?? 0) : 0;
      const pedidosHoy =
        ped.status === 'fulfilled' ? (ped.value.count ?? 0) : 0;
      const leadsHoy =
        leads.status === 'fulfilled' ? (leads.value.count ?? 0) : 0;
      const latestOrders: LatestOrder[] =
        orders.status === 'fulfilled'
          ? ((orders.value.data ?? []) as LatestOrder[])
          : [];
      const revenueWeek =
        revenue.status === 'fulfilled'
          ? ((revenue.value.data ?? []) as Array<{ total: number | null }>).reduce(
              (s, r) => s + (r.total ?? 0),
              0,
            )
          : 0;

      // Latencias simuladas — se pueden reemplazar por health-checks reales.
      const latencies = {
        vercel: Math.round(10 + Math.random() * 20),
        insforge: Math.round(5 + Math.random() * 15),
        github: Math.round(20 + Math.random() * 40),
        mercadopago: Math.round(15 + Math.random() * 35),
        cloudflare: Math.round(3 + Math.random() * 10),
      };

      setData({
        productosActivos,
        pedidosHoy,
        leadsHoy,
        revenueWeek,
        latestOrders,
        servicioStatus: {
          vercel: { online: true, latencyMs: latencies.vercel },
          insforge: { online: true, latencyMs: latencies.insforge },
          github: { online: true, latencyMs: latencies.github },
          mercadopago: { online: true, latencyMs: latencies.mercadopago },
          cloudflare: { online: true, latencyMs: latencies.cloudflare },
        },
        loading: false,
        lastUpdated: new Date(),
      });
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return data;
}
