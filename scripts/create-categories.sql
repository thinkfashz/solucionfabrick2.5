-- TABLA: categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_idx ON public.categories (lower(name));
CREATE INDEX IF NOT EXISTS categories_created_at_idx ON public.categories (created_at DESC);

-- Seed idempotente sin ON CONFLICT(name), porque algunas bases antiguas
-- solo tienen un índice único por lower(name) y no un constraint UNIQUE(name).
INSERT INTO public.categories (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('General', 'Categoría base para productos sin clasificación.'),
  ('Aire acondicionado', 'Equipos split, portátiles, multisplit e inverter.'),
  ('Hogar', 'Productos y accesorios para el hogar.'),
  ('Servicios', 'Servicios e instalaciones ofrecidas por Soluciones Fabrick.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE lower(c.name) = lower(v.name)
);
