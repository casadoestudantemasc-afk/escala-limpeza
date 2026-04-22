-- =============================================
-- MIGRAÇÃO 01 — Configuração de locais por dia
-- Execute no Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS config_locais_semana (
  id SERIAL PRIMARY KEY,
  semana DATE NOT NULL,    -- segunda-feira da semana
  dia DATE NOT NULL,       -- dia específico
  local_id INTEGER REFERENCES locais(id) ON DELETE CASCADE,
  UNIQUE(dia, local_id)
);

ALTER TABLE config_locais_semana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON config_locais_semana;
CREATE POLICY "public_all" ON config_locais_semana FOR ALL USING (true) WITH CHECK (true);
