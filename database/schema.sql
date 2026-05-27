CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','INATIVA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','INATIVA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS grupos_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  is_visual BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupo_permissoes (
  grupo_id UUID NOT NULL REFERENCES grupos_usuarios(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (grupo_id, permissao_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES grupos_usuarios(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','BLOQUEADO')),
  ultimo_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, email)
);

CREATE TABLE IF NOT EXISTS usuario_filiais (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, filial_id)
);

CREATE TABLE IF NOT EXISTS planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  duracao_meses INTEGER NOT NULL DEFAULT 1,
  multa_atraso_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  percentual_multa NUMERIC(8,2) NOT NULL DEFAULT 0,
  juros_dia NUMERIC(8,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  plano_id UUID REFERENCES planos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  data_nascimento DATE,
  sexo TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','CANCELADO','BLOQUEADO')),
  data_cadastro DATE NOT NULL DEFAULT CURRENT_DATE,
  data_inicio DATE,
  data_cancelamento DATE,
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  desconto_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC(8,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cpf),
  CONSTRAINT aluno_ativo_precisa_plano CHECK (status <> 'ATIVO' OR plano_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS treinadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cref TEXT,
  especialidade TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cpf)
);

CREATE TABLE IF NOT EXISTS treinador_filiais (
  treinador_id UUID NOT NULL REFERENCES treinadores(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (treinador_id, filial_id)
);

CREATE TABLE IF NOT EXISTS aluno_treinador (
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  treinador_id UUID NOT NULL REFERENCES treinadores(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aluno_id, treinador_id, data_inicio)
);

CREATE TABLE IF NOT EXISTS aluno_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES planos(id) ON DELETE RESTRICT,
  valor_mensal NUMERIC(12,2) NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  desconto_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC(8,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','CANCELADO')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
  aluno_plano_id UUID REFERENCES aluno_planos(id) ON DELETE SET NULL,
  valor_original NUMERIC(12,2) NOT NULL,
  valor_desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_multa NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_juros NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','ATRASADO','CANCELADO','RECEBIDO')),
  forma_pagamento_preferida TEXT CHECK (forma_pagamento_preferida IN ('BOLETO','PIX','CARTAO','DINHEIRO') OR forma_pagamento_preferida IS NULL),
  asaas_id TEXT,
  codigo_barras TEXT,
  link_pagamento TEXT,
  pix_copia_cola TEXT,
  observacoes TEXT,
  recebido_at TIMESTAMPTZ,
  cancelado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  valor_pago NUMERIC(12,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('BOLETO','PIX','CARTAO','DINHEIRO','MANUAL')),
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gateway TEXT,
  gateway_payment_id TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupos_musculares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS exercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  grupo_muscular_id UUID REFERENCES grupos_musculares(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  equipamento TEXT,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS treinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  treinador_id UUID REFERENCES treinadores(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  objetivo TEXT,
  nivel TEXT CHECK (nivel IN ('INICIANTE','INTERMEDIARIO','AVANCADO') OR nivel IS NULL),
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','FINALIZADO')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treino_exercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id UUID NOT NULL REFERENCES treinos(id) ON DELETE CASCADE,
  exercicio_id UUID NOT NULL REFERENCES exercicios(id) ON DELETE RESTRICT,
  grupo_treino TEXT,
  dia_semana TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  series INTEGER,
  repeticoes TEXT,
  carga TEXT,
  descanso_segundos INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  valor TEXT,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','numero','booleano','json','data')),
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, chave)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filiais_empresa ON filiais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_alunos_empresa_filial ON alunos(empresa_id, filial_id);
CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_empresa_filial ON cobrancas(empresa_id, filial_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status_vencimento ON cobrancas(status, vencimento);
CREATE INDEX IF NOT EXISTS idx_audit_empresa_entidade ON audit_logs(empresa_id, entidade, entidade_id);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'empresas','filiais','grupos_usuarios','permissoes','grupo_permissoes',
    'usuarios','usuario_filiais','planos','alunos','treinadores',
    'treinador_filiais','aluno_treinador','aluno_planos','cobrancas',
    'pagamentos','grupos_musculares','exercicios','treinos',
    'treino_exercicios','configuracoes_sistema','audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON empresas;
CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_filiais_updated_at ON filiais;
CREATE TRIGGER trg_filiais_updated_at BEFORE UPDATE ON filiais FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_alunos_updated_at ON alunos;
CREATE TRIGGER trg_alunos_updated_at BEFORE UPDATE ON alunos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_planos_updated_at ON planos;
CREATE TRIGGER trg_planos_updated_at BEFORE UPDATE ON planos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cobrancas_updated_at ON cobrancas;
CREATE TRIGGER trg_cobrancas_updated_at BEFORE UPDATE ON cobrancas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
