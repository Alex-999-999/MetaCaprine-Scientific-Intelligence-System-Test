-- Module 5 PRO tables
-- Run this in Supabase SQL editor for existing deployments.

CREATE TABLE IF NOT EXISTS gestations (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type VARCHAR(40) DEFAULT 'natural',
  breed_key TEXT,
  gestation_days INTEGER NOT NULL DEFAULT 150,
  doe_count INTEGER NOT NULL DEFAULT 1,
  expected_kids_per_doe NUMERIC(6,2) DEFAULT 1.70,
  pregnancy_loss_pct NUMERIC(5,2) DEFAULT 8.00,
  reminder_window_days INTEGER DEFAULT 14,
  management_level VARCHAR(20) DEFAULT 'standard',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_gestations_service_date ON gestations(service_date);
ALTER TABLE gestations ADD COLUMN IF NOT EXISTS service_type VARCHAR(40) DEFAULT 'natural';

CREATE TABLE IF NOT EXISTS gestation_events (
  id SERIAL PRIMARY KEY,
  gestation_id INTEGER NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_day INTEGER NOT NULL,
  event_date DATE NOT NULL,
  event_type VARCHAR(20) DEFAULT 'info',
  title TEXT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (gestation_id, event_key, event_day)
);

CREATE INDEX IF NOT EXISTS idx_gestation_events_date ON gestation_events(event_date);

CREATE TABLE IF NOT EXISTS gestation_stage_data (
  id SERIAL PRIMARY KEY,
  gestation_id INTEGER NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
  stage_key VARCHAR(20) NOT NULL,
  day_start INTEGER NOT NULL,
  day_end INTEGER NOT NULL,
  physiological_status TEXT,
  risk_level VARCHAR(20),
  nutrition JSONB,
  health JSONB,
  management JSONB,
  illustration_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (gestation_id, stage_key)
);

CREATE TABLE IF NOT EXISTS user_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  gestation_id INTEGER REFERENCES gestations(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  alert_type VARCHAR(20) DEFAULT 'info',
  alert_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, scenario_id, alert_key, alert_date)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_alert_date ON user_alerts(alert_date);

CREATE TABLE IF NOT EXISTS gestation_cases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL,
  service_type VARCHAR(40) DEFAULT 'natural',
  status VARCHAR(20) DEFAULT 'active',
  current_day INTEGER DEFAULT 0,
  probable_birth_date DATE,
  risk_band VARCHAR(20),
  risk_score NUMERIC(6,2),
  form_data JSONB,
  timeline_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, scenario_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_gestation_cases_user_scenario ON gestation_cases(user_id, scenario_id);
CREATE INDEX IF NOT EXISTS idx_gestation_cases_birth_date ON gestation_cases(probable_birth_date);
