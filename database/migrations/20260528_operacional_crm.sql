BEGIN;

CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  cargo TEXT,
  tipo TEXT NOT NULL DEFAULT 'FUNCIONARIO' CHECK (tipo IN ('FUNCIONARIO','PRESTADOR','TERCEIRO')),
  forma_remuneracao TEXT NOT NULL DEFAULT 'FIXO' CHECK (forma_remuneracao IN ('FIXO','COMISSAO','POR_SESSAO','POR_HORA')),
  valor_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','AFASTADO')),
  data_admissao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cpf)
);

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO','DOMINGO')),
  abre BOOLEAN NOT NULL DEFAULT TRUE,
  hora_abertura TIME,
  hora_fechamento TIME,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (filial_id, dia_semana)
);

CREATE TABLE IF NOT EXISTS modalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade_padrao INTEGER,
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','INATIVA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, filial_id, nome)
);

CREATE TABLE IF NOT EXISTS modalidade_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  modalidade_id UUID NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO','DOMINGO')),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  sala TEXT,
  capacidade INTEGER,
  remuneracao_tipo TEXT NOT NULL DEFAULT 'POR_SESSAO' CHECK (remuneracao_tipo IN ('POR_SESSAO','POR_HORA','PERCENTUAL','FIXO_MENSAL')),
  remuneracao_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL,
  aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
  responsavel_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  origem TEXT,
  etapa TEXT NOT NULL DEFAULT 'NOVO' CHECK (etapa IN ('NOVO','CONTATO','AGENDADO','NEGOCIACAO','GANHO','PERDIDO')),
  temperatura TEXT NOT NULL DEFAULT 'MORNO' CHECK (temperatura IN ('FRIO','MORNO','QUENTE')),
  valor_previsto NUMERIC(12,2) NOT NULL DEFAULT 0,
  probabilidade INTEGER NOT NULL DEFAULT 0 CHECK (probabilidade BETWEEN 0 AND 100),
  proximo_contato DATE,
  observacoes TEXT,
  perda_motivo TEXT,
  ganhou_at TIMESTAMPTZ,
  perdeu_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL,
  indicador_tipo TEXT NOT NULL CHECK (indicador_tipo IN ('ALUNO','COLABORADOR')),
  aluno_indicador_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
  colaborador_indicador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  indicado_nome TEXT NOT NULL,
  indicado_contato TEXT,
  indicado_email TEXT,
  oportunidade_id UUID REFERENCES crm_oportunidades(id) ON DELETE SET NULL,
  aluno_indicado_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','CONVERTIDA','RECOMPENSADA','CANCELADA')),
  recompensa_tipo TEXT NOT NULL DEFAULT 'DESCONTO_MENSALIDADE' CHECK (recompensa_tipo IN ('DESCONTO_MENSALIDADE','VALOR_FIXO','OUTRO')),
  recompensa_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  competencia_desconto TEXT,
  pago_at TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_filial ON colaboradores(empresa_id, filial_id);
CREATE INDEX IF NOT EXISTS idx_modalidade_horarios_filial_dia ON modalidade_horarios(filial_id, dia_semana, hora_inicio);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_empresa_etapa ON crm_oportunidades(empresa_id, etapa);
CREATE INDEX IF NOT EXISTS idx_indicacoes_empresa_status ON indicacoes(empresa_id, status);

INSERT INTO permissoes (codigo, modulo, acao, descricao, is_visual)
VALUES
('operacional.visualizar','operacional','visualizar','Visualizar cadastros operacionais',false),
('operacional.editar','operacional','editar','Criar e editar cadastros operacionais',false),
('crm.visualizar','crm','visualizar','Visualizar CRM',false),
('crm.editar','crm','editar','Criar e editar oportunidades do CRM',false)
ON CONFLICT (codigo) DO NOTHING;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['colaboradores','horarios_funcionamento','modalidades','modalidade_horarios','crm_oportunidades','indicacoes']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

COMMIT;
