-- Module 7 - Strategic Academy content table
-- Run this migration in Supabase SQL editor for existing deployments.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS m7_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT,
  business_impact TEXT,

  audience TEXT NOT NULL CHECK (
    audience IN ('productor_actual', 'nuevo_inversionista', 'ambos')
  ),

  content_type TEXT NOT NULL CHECK (
    content_type IN ('video_hook', 'video_pro', 'articulo', 'concepto_libro', 'caso_real')
  ),

  access_level TEXT NOT NULL CHECK (
    access_level IN ('free', 'pro', 'elite')
  ),

  video_url TEXT,
  thumbnail_url TEXT,
  article_url TEXT,

  duration_seconds INTEGER,

  related_module TEXT CHECK (
    related_module IN ('M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'none')
  ),

  cta_text TEXT,
  cta_url TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_m7_content_audience_active_sort
  ON m7_content (audience, is_active, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_m7_content_access
  ON m7_content (access_level);

CREATE OR REPLACE FUNCTION m7_content_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_m7_content_updated_at ON m7_content;
CREATE TRIGGER trg_m7_content_updated_at
BEFORE UPDATE ON m7_content
FOR EACH ROW
EXECUTE FUNCTION m7_content_set_updated_at();

-- Repair legacy mojibake rows from previous seed versions (safe no-op when not present)
UPDATE m7_content
SET
  title = CASE title
    WHEN 'No estÃ¡s viendo una cabra. EstÃ¡s viendo un activo productivo.' THEN 'No estás viendo una cabra. Estás viendo un activo productivo.'
    WHEN 'Antes de invertir en tierra, cemento o locales, mira el retorno potencial de una cabra bien diseÃ±ada.' THEN 'Antes de invertir en tierra, cemento o locales, mira el retorno potencial de una cabra bien diseñada.'
    ELSE title
  END,
  subtitle = CASE subtitle
    WHEN 'DiagnÃ³stico para productor actual' THEN 'Diagnóstico para productor actual'
    WHEN 'OrientaciÃ³n para nuevo inversionista' THEN 'Orientación para nuevo inversionista'
    ELSE subtitle
  END,
  summary = CASE summary
    WHEN 'IntroducciÃ³n estratÃ©gica para entender a la cabra como unidad de negocio.' THEN 'Introducción estratégica para entender a la cabra como unidad de negocio.'
    WHEN 'Marco inicial para identificar pÃ©rdidas ocultas y priorizar control de costos.' THEN 'Marco inicial para identificar pérdidas ocultas y priorizar control de costos.'
    ELSE summary
  END,
  business_impact = CASE business_impact
    WHEN 'Cambia la toma de decisiones de biologÃ­a aislada a rentabilidad integrada.' THEN 'Cambia la toma de decisiones de biología aislada a rentabilidad integrada.'
    WHEN 'Permite evaluar inversiÃ³n con horizonte financiero y payback estimado.' THEN 'Permite evaluar inversión con horizonte financiero y payback estimado.'
    ELSE business_impact
  END,
  cta_text = CASE cta_text
    WHEN 'Descubre el potencial econÃ³mico' THEN 'Descubre el potencial económico'
    WHEN 'Simular mi inversiÃ³n' THEN 'Simular mi inversión'
    ELSE cta_text
  END;

-- Minimal starter layer for FREE hooks (editable later from M7 admin panel)
INSERT INTO m7_content (
  title,
  subtitle,
  summary,
  business_impact,
  audience,
  content_type,
  access_level,
  related_module,
  cta_text,
  cta_url,
  sort_order,
  is_active
)
SELECT * FROM (
  VALUES
  (
    'No estás viendo una cabra. Estás viendo un activo productivo.',
    'Video gancho para productores e inversionistas',
    'Introducción estratégica para entender a la cabra como unidad de negocio.',
    'Cambia la toma de decisiones de biología aislada a rentabilidad integrada.',
    'ambos',
    'video_hook',
    'free',
    'M4',
    'Descubre el potencial económico',
    '/module4',
    1,
    true
  ),
  (
    'Si tienes cabras y no sabes tu costo real, no tienes una finca: tienes una apuesta.',
    'Diagnóstico para productor actual',
    'Marco inicial para identificar pérdidas ocultas y priorizar control de costos.',
    'Activa decisiones con base en margen real por litro y por ciclo.',
    'productor_actual',
    'video_hook',
    'free',
    'M1',
    'Diagnosticar mi finca',
    '/module1',
    2,
    true
  ),
  (
    'Antes de invertir en tierra, cemento o locales, mira el retorno potencial de una cabra bien diseñada.',
    'Orientación para nuevo inversionista',
    'Comparativa de retorno para visualizar a la cabra como activo escalable.',
    'Permite evaluar inversión con horizonte financiero y payback estimado.',
    'nuevo_inversionista',
    'video_hook',
    'free',
    'M4',
    'Simular mi inversión',
    '/module4',
    3,
    true
  )
) AS seed_data (
  title,
  subtitle,
  summary,
  business_impact,
  audience,
  content_type,
  access_level,
  related_module,
  cta_text,
  cta_url,
  sort_order,
  is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM m7_content existing
  WHERE existing.title = seed_data.title
    AND existing.audience = seed_data.audience
);

