-- InsForge database schema for fabrick-store

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio INTEGER NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  imagen_url TEXT,
  stock INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  destacado BOOLEAN DEFAULT false,
  tagline VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  estado VARCHAR(50) DEFAULT 'pendiente',
  total INTEGER NOT NULL,
  direccion_entrega TEXT,
  telefono VARCHAR(20),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  nombre_producto VARCHAR(255),
  cantidad INTEGER NOT NULL,
  precio_unitario INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  estado_entrega VARCHAR(50) DEFAULT 'pendiente',
  fecha_estimada DATE,
  responsable VARCHAR(255),
  notas_entrega TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);
