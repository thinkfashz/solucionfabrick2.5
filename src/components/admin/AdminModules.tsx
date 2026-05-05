/**
 * Admin Module Cards - Animated module buttons for admin dashboard
 * Each module has hover animations, icons, and proper responsive design
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Telescope,
  BarChart3,
  Settings,
  FileText,
  ShoppingCart,
  MessageSquare,
  Zap,
  Package,
  Users,
  TrendingUp,
} from 'lucide-react';

interface AdminModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  status?: 'active' | 'new' | 'beta';
}

const ADMIN_MODULES: AdminModule[] = [
  {
    id: 'observatory',
    title: 'Observatory',
    description: 'Dashboard 3D en tiempo real de todos los servicios',
    href: '/admin/observatory',
    icon: <Telescope className="w-6 h-6" />,
    color: 'from-yellow-400 to-orange-500',
    badge: 'LIVE',
    status: 'active',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Métricas, gráficos y análisis en tiempo real',
    href: '/admin',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'from-blue-400 to-cyan-500',
  },
  {
    id: 'blog',
    title: 'Blog',
    description: 'Subir, editar y moderar artículos Markdown',
    href: '/admin/blog',
    icon: <FileText className="w-6 h-6" />,
    color: 'from-green-400 to-emerald-500',
  },
  {
    id: 'cms',
    title: 'CMS Editor',
    description: 'Editar contenido dinámico de todas las páginas',
    href: '/admin/home',
    icon: <Settings className="w-6 h-6" />,
    color: 'from-purple-400 to-pink-500',
  },
  {
    id: 'products',
    title: 'Catálogo',
    description: 'Gestionar productos, precios y stock',
    href: '/admin/products',
    icon: <Package className="w-6 h-6" />,
    color: 'from-red-400 to-rose-500',
    status: 'new',
  },
  {
    id: 'orders',
    title: 'Pedidos',
    description: 'Ver y gestionar órdenes de tienda',
    href: '/admin/orders',
    icon: <ShoppingCart className="w-6 h-6" />,
    color: 'from-indigo-400 to-blue-500',
  },
  {
    id: 'comments',
    title: 'Comentarios',
    description: 'Moderar comentarios del blog',
    href: '/admin/blog/comments',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'from-teal-400 to-green-500',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Datos, conversiones y comportamiento de usuarios',
    href: '/admin/analytics',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'from-amber-400 to-yellow-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

const hoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.03,
    y: -4,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

export function AdminModules() {
  return (
    <motion.div
      className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-max"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {ADMIN_MODULES.map((module) => (
        <motion.div key={module.id} variants={itemVariants}>
          <Link href={module.href}>
            <motion.div
              className={`relative h-full rounded-xl sm:rounded-2xl border border-white/10 
                bg-gradient-to-br ${module.color} p-4 sm:p-5 md:p-6 
                backdrop-blur-sm overflow-hidden group transition-all duration-300 
                hover:border-white/20 hover:shadow-lg
                ${
                  module.status === 'active'
                    ? 'ring-2 ring-green-400/30'
                    : module.status === 'new'
                      ? 'ring-2 ring-blue-400/30'
                      : ''
                }`}
              variants={hoverVariants}
              initial="rest"
              whileHover="hover"
            >
              {/* Background glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />

              {/* Status badge */}
              {module.badge && (
                <motion.div
                  className="absolute top-2 sm:top-3 right-2 sm:right-3"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="inline-block px-2.5 sm:px-3 py-1 text-xs font-black uppercase 
                    tracking-wider text-black bg-yellow-400 rounded-full">
                    {module.badge}
                  </span>
                </motion.div>
              )}

              {/* Icon container */}
              <div className="mb-3 sm:mb-4 flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center 
                rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors duration-300">
                <div className="text-white drop-shadow-lg">{module.icon}</div>
              </div>

              {/* Title */}
              <h3 className="font-black text-sm sm:text-base md:text-lg text-white mb-1 sm:mb-2 
                line-clamp-2 group-hover:text-yellow-100 transition-colors duration-300">
                {module.title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-white/70 line-clamp-2 sm:line-clamp-3 
                group-hover:text-white/85 transition-colors duration-300">
                {module.description}
              </p>

              {/* Bottom indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-white/0 via-white/40 to-white/0 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Arrow on hover */}
              <motion.div
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100"
                initial={{ x: -4, opacity: 0 }}
                whileHover={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">→</span>
                </div>
              </motion.div>
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
