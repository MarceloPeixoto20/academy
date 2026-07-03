BEGIN;

CREATE TABLE IF NOT EXISTS crm_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  cor TEXT,
  probabilidade_padrao INTEGER DEFAULT 0 CHECK (probabilidade_padrao BETWEEN 0 AND 100),
  campos_obrigatorios TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS indicacao_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  slug TEXT NOT NULL,
  recompensa_aluno_tipo TEXT NOT NULL DEFAULT 'DESCONTO_MENSALIDADE',
  recompensa_aluno_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  recompensa_colaborador_tipo TEXT NOT NULL DEFAULT 'VALOR_FIXO',
  recompensa_colaborador_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  inicio DATE,
  fim DATE,
  sem_fim BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','INATIVA','ENCERRADA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, slug)
);

ALTER TABLE indicacoes ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES indicacao_campanhas(id) ON DELETE SET NULL;
ALTER TABLE indicacoes ADD COLUMN IF NOT EXISTS token_indicador TEXT;
ALTER TABLE indicacoes ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'MANUAL';

CREATE TABLE IF NOT EXISTS cobranca_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PREVIA' CHECK (status IN ('PREVIA','GERADO','CANCELADO')),
  quantidade_prevista INTEGER NOT NULL DEFAULT 0,
  quantidade_gerada INTEGER NOT NULL DEFAULT 0,
  valor_total_previsto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total_gerado NUMERIC(12,2) NOT NULL DEFAULT 0,
  filtros JSONB,
  preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmado_at TIMESTAMPTZ,
  cancelado_at TIMESTAMPTZ
);

ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES cobranca_lotes(id) ON DELETE SET NULL;

INSERT INTO permissoes (codigo, modulo, acao, descricao, is_visual)
VALUES
('crm.configurar','crm','configurar','Configurar etapas e regras do CRM',false),
('indicacoes.campanhas','indicacoes','campanhas','Criar campanhas e links de indicação',false),
('financeiro.lotes','financeiro','lotes','Gerenciar lotes de cobranças',false),
('configuracoes.bloqueio','configuracoes','bloqueio','Configurar bloqueio automático de inadimplentes e balança',false)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO crm_etapas (empresa_id, nome, codigo, ordem, probabilidade_padrao, campos_obrigatorios)
SELECT e.id, etapa.nome, etapa.codigo, etapa.ordem, etapa.probabilidade, etapa.campos
FROM empresas e
CROSS JOIN (VALUES
  ('Novo Lead','NOVO',1,5,ARRAY[]::TEXT[]),
  ('Tentativa de Contato','CONTATO',2,15,ARRAY['telefone']::TEXT[]),
  ('Visita/Aula Experimental Agendada','AGENDADO',3,35,ARRAY['telefone','proximo_contato']::TEXT[]),
  ('Proposta/Negociação','NEGOCIACAO',4,60,ARRAY['telefone','valor_previsto']::TEXT[]),
  ('Fechado/Ganho','GANHO',5,100,ARRAY['telefone']::TEXT[]),
  ('Perdido','PERDIDO',6,0,ARRAY['perda_motivo']::TEXT[])
) AS etapa(nome, codigo, ordem, probabilidade, campos)
ON CONFLICT (empresa_id, codigo) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_crm_etapas_empresa_ordem ON crm_etapas(empresa_id, ordem);
CREATE INDEX IF NOT EXISTS idx_indicacao_campanhas_empresa_slug ON indicacao_campanhas(empresa_id, slug);
CREATE INDEX IF NOT EXISTS idx_cobranca_lotes_empresa_status ON cobranca_lotes(empresa_id, status);

COMMIT;
