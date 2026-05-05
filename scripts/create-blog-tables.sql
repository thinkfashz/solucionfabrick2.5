-- Tabla de comentarios para artículos de blog
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_slug VARCHAR NOT NULL,
  author_name VARCHAR NOT NULL,
  author_email VARCHAR NOT NULL,
  author_url VARCHAR,
  content TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (post_slug) REFERENCES blog_posts(slug) ON DELETE CASCADE
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_slug ON blog_comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at DESC);

-- RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_comments_select ON blog_comments 
  FOR SELECT USING (status = 'approved' OR current_setting('app.role') = 'admin');

CREATE POLICY blog_comments_insert ON blog_comments 
  FOR INSERT WITH CHECK (true);

-- Tabla de archivos de blog subidos (para gestión de .md)
CREATE TABLE IF NOT EXISTS blog_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  file_size INT,
  mime_type VARCHAR,
  uploaded_by VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(filename)
);

CREATE INDEX IF NOT EXISTS idx_blog_uploads_created_at ON blog_uploads(created_at DESC);
