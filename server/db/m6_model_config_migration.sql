-- Module 6 model config (Supabase-backed)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.m6_model_config (
  id SERIAL PRIMARY KEY,
  config_type TEXT NOT NULL CHECK (config_type IN ('system', 'weaning')),
  config_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (config_type, config_key)
);

CREATE INDEX IF NOT EXISTS idx_m6_model_config_active_sort
  ON public.m6_model_config (config_type, is_active, sort_order, created_at);

-- Seed from "Hoja de cálculo M6 - Hoja 1.csv"
INSERT INTO public.m6_model_config (config_type, config_key, payload, sort_order, is_active)
VALUES
  (
    'system',
    'Intensivo',
    jsonb_build_object(
      'peso90', 20,
      'diasLevante', 90,
      'lecheDia', 1.2,
      'sustitutoDia', 1.2,
      'concDia', 0.25,
      'henoDia', 0.15,
      'precioLeche', 1,
      'precioSustituto', 1,
      'precioConc', 0.65,
      'precioHeno', 0.25,
      'costoSanitario', 7,
      'factorIntensivo', 1,
      'factorSemi', 0.8,
      'factorExtensivo', 0.6
    ),
    1,
    true
  ),
  (
    'system',
    'Semi-intensivo',
    jsonb_build_object(
      'peso90', 16,
      'diasLevante', 90,
      'lecheDia', 0.9,
      'sustitutoDia', 0.9,
      'concDia', 0.18,
      'henoDia', 0.1,
      'precioLeche', 1,
      'precioSustituto', 1,
      'precioConc', 0.65,
      'precioHeno', 0.25,
      'costoSanitario', 6,
      'factorIntensivo', 1,
      'factorSemi', 0.8,
      'factorExtensivo', 0.6
    ),
    2,
    true
  ),
  (
    'system',
    'Extensivo',
    jsonb_build_object(
      'peso90', 12,
      'diasLevante', 90,
      'lecheDia', 0.6,
      'sustitutoDia', 0.6,
      'concDia', 0.1,
      'henoDia', 0.05,
      'precioLeche', 1,
      'precioSustituto', 1,
      'precioConc', 0.65,
      'precioHeno', 0.25,
      'costoSanitario', 5,
      'factorIntensivo', 1,
      'factorSemi', 0.8,
      'factorExtensivo', 0.6
    ),
    3,
    true
  ),
  (
    'weaning',
    '45',
    jsonb_build_object(
      'diasLeche', 45,
      'diasSustituto', 45,
      'diasConcentrado', 40,
      'diasHeno', 30
    ),
    45,
    true
  ),
  (
    'weaning',
    '60',
    jsonb_build_object(
      'diasLeche', 60,
      'diasSustituto', 60,
      'diasConcentrado', 45,
      'diasHeno', 30
    ),
    60,
    true
  ),
  (
    'weaning',
    '70',
    jsonb_build_object(
      'diasLeche', 70,
      'diasSustituto', 70,
      'diasConcentrado', 55,
      'diasHeno', 40
    ),
    70,
    true
  ),
  (
    'weaning',
    '80',
    jsonb_build_object(
      'diasLeche', 80,
      'diasSustituto', 80,
      'diasConcentrado', 60,
      'diasHeno', 50
    ),
    80,
    true
  ),
  (
    'weaning',
    '90',
    jsonb_build_object(
      'diasLeche', 90,
      'diasSustituto', 90,
      'diasConcentrado', 70,
      'diasHeno', 60
    ),
    90,
    true
  )
ON CONFLICT (config_type, config_key)
DO UPDATE SET
  payload = EXCLUDED.payload,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
