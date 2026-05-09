'use client';

/**
 * System Monitor
 *
 * Visualización en tiempo real del estado del sistema:
 * - Database (PostgreSQL)
 * - Cache (Redis)
 * - APIs externas (Stripe, Meta, Vercel)
 * - Servicios internos (Auth, Storage, Functions)
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Server, RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  uptime: number;
  lastCheck: Date;
  icon: React.ReactNode;
}

const SERVICES: ServiceStatus[] = [
  {
    name: 'PostgreSQL',
    status: 'healthy',
    latency: 12,
    uptime: 99.9,
    lastCheck: new Date(),
    icon: <Database className="w-4 h-4" />,
  },
  {
    name: 'Redis Cache',
    status: 'healthy',
    latency: 2,
    uptime: 99.8,
    lastCheck: new Date(),
    icon: <Server className="w-4 h-4" />,
  },
  {
    name: 'Stripe API',
    status: 'healthy',
    latency: 45,
    uptime: 99.95,
    lastCheck: new Date(),
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    name: 'Meta Graph API',
    status: 'healthy',
    latency: 65,
    uptime: 99.5,
    lastCheck: new Date(),
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    name: 'Auth Service',
    status: 'healthy',
    latency: 8,
    uptime: 99.99,
    lastCheck: new Date(),
    icon: <CheckCircle className="w-4 h-4" />,
  },
  {
    name: 'Storage Service',
    status: 'degraded',
    latency: 234,
    uptime: 98.5,
    lastCheck: new Date(),
    icon: <Server className="w-4 h-4" />,
  },
];

export default function SystemMonitor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [services, setServices] = useState<ServiceStatus[]>(SERVICES);
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  // Simular cambios en latencia
  useEffect(() => {
    const interval = setInterval(() => {
      setServices((prev) =>
        prev.map((service) => ({
          ...service,
          latency: Math.max(5, service.latency + (Math.random() - 0.5) * 20),
          uptime: Math.min(100, Math.max(95, service.uptime + (Math.random() - 0.5) * 0.5)),
          lastCheck: new Date(),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Dibujar canvas 3D (2D simulado para performance)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Fondo con gradiente
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#18181b');
      gradient.addColorStop(1, '#09090b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.05)';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Dibujar conexiones entre servicios
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) / 3;

      services.forEach((service, i) => {
        const angle = (i / services.length) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // Línea al centro
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Nodo
        const statusColor =
          service.status === 'healthy'
            ? '#22c55e'
            : service.status === 'degraded'
              ? '#eab308'
              : '#ef4444';

        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.strokeStyle = statusColor + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Centro
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(animate);
    };

    animate();
  }, [services]);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'degraded':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'offline':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-yellow-400 flex items-center gap-2">
            <Server className="w-8 h-8" /> Monitor del Sistema
          </h1>
          <p className="text-sm text-zinc-400">
            Estado en tiempo real de bases de datos, APIs y servicios
          </p>
        </div>

        {/* Canvas Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-yellow-400/10 bg-black/40 overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={1000}
            height={400}
            className="w-full h-auto block"
            aria-label="Visualización del estado del sistema en tiempo real"
          />
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {services.map((service, i) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onMouseEnter={() => setHoveredService(service.name)}
                onMouseLeave={() => setHoveredService(null)}
                className={`rounded-xl border p-4 transition-all cursor-pointer ${getStatusColor(
                  service.status
                )} ${hoveredService === service.name ? 'scale-105' : ''}`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {service.icon}
                      <h3 className="font-bold text-sm">{service.name}</h3>
                    </div>
                    {getStatusIcon(service.status)}
                  </div>

                  {/* Status Badge */}
                  <div className="text-xs font-bold uppercase tracking-wider opacity-75">
                    {service.status === 'healthy'
                      ? '✓ Operacional'
                      : service.status === 'degraded'
                        ? '⚠ Degradado'
                        : '✗ Offline'}
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Latencia</span>
                      <motion.span
                        key={service.latency}
                        animate={{ opacity: [1, 0.5, 1] }}
                        className="font-mono font-bold"
                      >
                        {Math.round(service.latency)}ms
                      </motion.span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Uptime</span>
                      <span className="font-mono font-bold">{service.uptime.toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${service.latency}%` }}
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                        transition={{ type: 'spring', stiffness: 100 }}
                      />
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${service.uptime}%` }}
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                        transition={{ type: 'spring', stiffness: 100 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        <div className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Healthy', value: services.filter((s) => s.status === 'healthy').length },
              { label: 'Degraded', value: services.filter((s) => s.status === 'degraded').length },
              {
                label: 'Avg Latency',
                value: `${Math.round(services.reduce((a, s) => a + s.latency, 0) / services.length)}ms`,
              },
              {
                label: 'Avg Uptime',
                value: `${(services.reduce((a, s) => a + s.uptime, 0) / services.length).toFixed(2)}%`,
              },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-xs text-zinc-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-bold text-yellow-400">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30 font-bold transition-all">
            <RefreshCw className="w-4 h-4" /> Actualizar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
