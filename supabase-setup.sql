-- =============================================
-- ESCALA DE LIMPEZA - Casa do Estudante
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Moradores
CREATE TABLE IF NOT EXISTS moradores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locais de limpeza
CREATE TABLE IF NOT EXISTS locais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER
);

-- Indisponibilidades (dias que o morador NÃO pode fazer a escala)
CREATE TABLE IF NOT EXISTS indisponibilidades (
  id SERIAL PRIMARY KEY,
  morador_id INTEGER REFERENCES moradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(morador_id, data)
);

-- Escala gerada
CREATE TABLE IF NOT EXISTS escala (
  id SERIAL PRIMARY KEY,
  morador_id INTEGER REFERENCES moradores(id) ON DELETE CASCADE,
  local_id INTEGER REFERENCES locais(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  semana DATE NOT NULL, -- segunda-feira da semana
  gerado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Feriados
CREATE TABLE IF NOT EXISTS feriados (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE indisponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON moradores;
DROP POLICY IF EXISTS "public_all" ON locais;
DROP POLICY IF EXISTS "public_all" ON indisponibilidades;
DROP POLICY IF EXISTS "public_all" ON escala;
DROP POLICY IF EXISTS "public_all" ON feriados;

CREATE POLICY "public_all" ON moradores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON locais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON indisponibilidades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON escala FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON feriados FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- DADOS INICIAIS - Moradores
-- =============================================

INSERT INTO moradores (nome) VALUES
('Adrian Cailan Friedrich'),
('André Ferrera Seco'),
('Artur Minussi da Costa'),
('Augusto Borges dos Anjos'),
('Augusto da Rosa Hamester'),
('Benhur Silva de Oliveira'),
('Bruno Andres Silveira Pereira'),
('Bruno Marques Trojan'),
('Carlos Daniel Henckes de Souza'),
('Celso Mathias Fabris Espírito Santo'),
('Davi Richardt Berger'),
('Diego Leal de Lima'),
('Eduardo Emanuel Braatz da Silva'),
('Eduardo Vargas Rodrigues'),
('Enzo Arthur Hammes Hendges'),
('Fernando Produratti Kemmerich'),
('Francisco Toscani Vielmo'),
('Gabriel Pedra da Silva'),
('Guilherme Willian Carpowiski de Lima'),
('Guilherme Worm da Costa'),
('João Arthur Schneider de Oliveira'),
('João Gabriel Munhós de Campos'),
('João Pedro Porto de Almeida'),
('João Vitor Nardes Ssibet'),
('Kauã Adolfo Zago'),
('Kauã Ariel Siqueira de Almeida'),
('Kauê Machado de Munhoz'),
('Kauê Schoenfeldt Zimermann'),
('Leonidas do Amarante de Assis Brasil'),
('Luis Eduardo de Moraes Ferrão'),
('Luciano Telles Fagundes Filho'),
('Marcos Emanuel Medeiros Gonçalves'),
('Mathias Almeida de Siqueira'),
('Matheus Almeida de Siqueira'),
('Murilo Henrique Gehlen'),
('Pedro Machado Barbosa'),
('Pedro Sales Nicola'),
('Ruan Pablo Ceron Morin'),
('Samuel Bley Toniasso'),
('Tálisson Felipe Bugs'),
('Thiago Atzler Pivetta'),
('Thiago Leonardo Quinteto Simon'),
('Vinícius Gabriel Müller')
ON CONFLICT (nome) DO NOTHING;

-- =============================================
-- DADOS INICIAIS - Locais
-- =============================================

INSERT INTO locais (nome, ordem) VALUES
('Lavanderias', 1),
('Área Externa | Águas', 2),
('Corredor 3º', 3),
('Corredor 2º', 4),
('Corredor 1º', 5),
('Escadas', 6),
('Banheiros | Sala de estudo', 7),
('Hall', 8),
('Cozinha', 9)
ON CONFLICT (nome) DO NOTHING;

-- =============================================
-- DADOS INICIAIS - Feriados 2026
-- =============================================

INSERT INTO feriados (data, descricao) VALUES
('2026-01-01', 'Confraternização Universal'),
('2026-04-03', 'Sexta-feira Santa'),
('2026-04-21', 'Tiradentes'),
('2026-05-01', 'Dia do Trabalho'),
('2026-06-04', 'Corpus Christi'),
('2026-09-07', 'Independência do Brasil'),
('2026-10-12', 'Nossa Senhora Aparecida'),
('2026-11-02', 'Finados'),
('2026-11-15', 'Proclamação da República'),
('2026-11-20', 'Consciência Negra'),
('2026-12-25', 'Natal')
ON CONFLICT (data) DO NOTHING;
