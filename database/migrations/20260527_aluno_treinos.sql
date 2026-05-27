BEGIN;

CREATE TABLE IF NOT EXISTS aluno_treinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  treino_id UUID NOT NULL REFERENCES treinos(id) ON DELETE CASCADE,
  treinador_id UUID REFERENCES treinadores(id) ON DELETE SET NULL,
  dia_semana TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','FINALIZADO')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aluno_treinos_aluno ON aluno_treinos(aluno_id, status);
CREATE INDEX IF NOT EXISTS idx_aluno_treinos_treino ON aluno_treinos(treino_id);
CREATE INDEX IF NOT EXISTS idx_treino_exercicios_treino ON treino_exercicios(treino_id);

ALTER TABLE aluno_treinos ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_aluno_treinos_updated_at ON aluno_treinos;
CREATE TRIGGER trg_aluno_treinos_updated_at
BEFORE UPDATE ON aluno_treinos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'treinos'
      AND column_name = 'aluno_id'
  ) THEN
    INSERT INTO aluno_treinos (
      empresa_id,
      filial_id,
      aluno_id,
      treino_id,
      treinador_id,
      dia_semana,
      status,
      data_inicio,
      data_fim,
      observacoes,
      created_at,
      updated_at
    )
    SELECT
      t.empresa_id,
      t.filial_id,
      t.aluno_id,
      t.id,
      t.treinador_id,
      'SEGUNDA',
      CASE WHEN t.status IN ('ATIVO','INATIVO','FINALIZADO') THEN t.status ELSE 'ATIVO' END,
      COALESCE(t.data_inicio, CURRENT_DATE),
      t.data_fim,
      t.observacoes,
      t.created_at,
      t.updated_at
    FROM treinos t
    WHERE t.aluno_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM aluno_treinos at
        WHERE at.aluno_id = t.aluno_id
          AND at.treino_id = t.id
      );

    ALTER TABLE treinos DROP COLUMN aluno_id;
  END IF;
END $$;

COMMIT;
