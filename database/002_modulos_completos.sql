CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS aluno_medidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg NUMERIC(6,2),
  altura_cm NUMERIC(6,2),
  pescoco_cm NUMERIC(6,2),
  ombro_cm NUMERIC(6,2),
  torax_cm NUMERIC(6,2),
  cintura_cm NUMERIC(6,2),
  abdomen_cm NUMERIC(6,2),
  quadril_cm NUMERIC(6,2),
  braco_direito_cm NUMERIC(6,2),
  braco_esquerdo_cm NUMERIC(6,2),
  antebraco_direito_cm NUMERIC(6,2),
  antebraco_esquerdo_cm NUMERIC(6,2),
  coxa_direita_cm NUMERIC(6,2),
  coxa_esquerda_cm NUMERIC(6,2),
  panturrilha_direita_cm NUMERIC(6,2),
  panturrilha_esquerda_cm NUMERIC(6,2),
  percentual_gordura NUMERIC(5,2),
  percentual_massa_magra NUMERIC(5,2),
  massa_muscular_kg NUMERIC(6,2),
  massa_gorda_kg NUMERIC(6,2),
  imc NUMERIC(6,2),
  pressao_arterial TEXT,
  frequencia_cardiaca INTEGER,
  objetivo TEXT,
  observacoes TEXT,
  responsavel_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  treinador_id UUID REFERENCES treinadores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aluno_medidas_empresa_filial ON aluno_medidas(empresa_id, filial_id);
CREATE INDEX IF NOT EXISTS idx_aluno_medidas_aluno_data ON aluno_medidas(aluno_id, data_avaliacao DESC);

ALTER TABLE aluno_medidas ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_aluno_medidas_updated_at ON aluno_medidas;
CREATE TRIGGER trg_aluno_medidas_updated_at
BEFORE UPDATE ON aluno_medidas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS competencia DATE;
ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS gateway TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cobrancas_aluno_competencia_plano
ON cobrancas(aluno_id, competencia, aluno_plano_id)
WHERE competencia IS NOT NULL;

INSERT INTO permissoes (codigo, modulo, acao, descricao, is_visual)
VALUES
('filiais.visualizar','filiais','visualizar','Visualizar filiais',false),
('filiais.criar','filiais','criar','Criar filiais',false),
('filiais.editar','filiais','editar','Editar filiais',false),
('filiais.excluir','filiais','excluir','Inativar filiais',false),

('alunos.medidas.visualizar','alunos','medidas.visualizar','Visualizar medidas do aluno',false),
('alunos.medidas.criar','alunos','medidas.criar','Cadastrar medidas do aluno',false),
('alunos.medidas.editar','alunos','medidas.editar','Editar medidas do aluno',false),
('alunos.medidas.excluir','alunos','medidas.excluir','Excluir medidas do aluno',false),
('alunos.medidas.evolucao','alunos','medidas.evolucao','Visualizar evolução física do aluno',true),

('exercicios.visualizar','exercicios','visualizar','Visualizar exercícios',false),
('exercicios.criar','exercicios','criar','Criar exercícios',false),
('exercicios.editar','exercicios','editar','Editar exercícios',false),
('exercicios.excluir','exercicios','excluir','Inativar exercícios',false),

('logs.visualizar','logs','visualizar','Visualizar logs de auditoria',false)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO grupo_permissoes (grupo_id, permissao_id, created_at)
SELECT g.id, p.id, NOW()
FROM grupos_usuarios g
CROSS JOIN permissoes p
WHERE g.is_admin = TRUE
ON CONFLICT (grupo_id, permissao_id) DO NOTHING;
