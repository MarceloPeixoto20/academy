BEGIN;

INSERT INTO permissoes (codigo, modulo, acao, descricao, is_visual)
VALUES
('integracoes.visualizar','integracoes','visualizar','Visualizar integrações',false),
('integracoes.editar','integracoes','editar','Editar integrações',false),
('configuracoes.bloqueio','configuracoes','bloqueio','Aplicar bloqueio de inadimplentes',false)
ON CONFLICT (codigo) DO NOTHING;

UPDATE permissoes
SET descricao = 'Aplicar bloqueio de inadimplentes'
WHERE codigo = 'configuracoes.bloqueio';

INSERT INTO grupo_permissoes (grupo_id, permissao_id, created_at)
SELECT g.id, p.id, NOW()
FROM grupos_usuarios g
CROSS JOIN permissoes p
WHERE g.is_admin = TRUE
  AND p.codigo IN (
    'integracoes.visualizar',
    'integracoes.editar',
    'configuracoes.bloqueio'
  )
ON CONFLICT (grupo_id, permissao_id) DO NOTHING;

INSERT INTO configuracoes_sistema (empresa_id, chave, valor, tipo, descricao)
SELECT e.id, c.chave, c.valor, c.tipo, c.descricao
FROM empresas e
CROSS JOIN (VALUES
  ('inadimplencia.bloqueio_automatico_ativo', 'false', 'booleano', 'Ativa bloqueio automático para alunos inadimplentes'),
  ('inadimplencia.dias_atraso_bloqueio', '10', 'numero', 'Quantidade de dias de atraso para aplicar bloqueio'),
  ('inadimplencia.bloquear_acesso_automaticamente', 'true', 'booleano', 'Bloqueia acesso do aluno quando o bloqueio automático for aplicado'),
  ('inadimplencia.desbloquear_apos_pagamento', 'true', 'booleano', 'Libera acesso automaticamente após baixa de pagamento'),
  ('financeiro.geracao_automatica_faturas_ativa', 'false', 'booleano', 'Ativa geração automática das faturas do mês'),
  ('financeiro.dia_geracao_faturas', '1', 'numero', 'Dia do mês usado para gerar faturas automaticamente'),
  ('financeiro.competencia_geracao', 'MES_ATUAL', 'texto', 'Competência usada na geração automática de faturas'),
  ('financeiro.forma_pagamento_padrao', 'BOLETO', 'texto', 'Forma de pagamento padrão das faturas geradas'),
  ('financeiro.ignorar_cobrancas_existentes', 'true', 'booleano', 'Evita duplicar cobranças já existentes para a mesma competência'),
  ('financeiro.notificar_aluno_ao_gerar_fatura', 'false', 'booleano', 'Envia aviso ao aluno quando a fatura for gerada'),
  ('financeiro.dias_alerta_vencimento', '3', 'numero', 'Dias antes do vencimento para alerta financeiro'),
  ('alunos.periodicidade_avaliacao_dias', '30', 'numero', 'Periodicidade recomendada para avaliação física'),
  ('treinos.alertar_treino_vencido_dias', '7', 'numero', 'Dias para alerta de treino vencido ou próximo do fim'),
  ('crm.dias_sem_contato_alerta', '3', 'numero', 'Dias sem contato para alertar oportunidade no CRM'),
  ('indicacoes.exigir_aprovacao_recompensa', 'true', 'booleano', 'Exige aprovação antes de liberar recompensa de indicação'),
  ('balanca.integracao_ativa', 'false', 'booleano', 'Ativa integração com balança'),
  ('balanca.modo', 'MANUAL', 'texto', 'Modo de integração com balança'),
  ('balanca.endpoint', '', 'texto', 'Endpoint HTTP da balança'),
  ('balanca.porta_serial', '', 'texto', 'Porta serial da balança'),
  ('pagamentos.gateway_ativo', 'false', 'booleano', 'Ativa gateway de pagamentos'),
  ('pagamentos.provedor', 'ASAAS', 'texto', 'Provedor de pagamentos'),
  ('pagamentos.api_base_url', '', 'texto', 'URL base da API de pagamentos'),
  ('pagamentos.webhook_ativo', 'false', 'booleano', 'Ativa webhook de pagamentos'),
  ('comunicacao.whatsapp_ativo', 'false', 'booleano', 'Ativa integração de WhatsApp'),
  ('comunicacao.provedor', 'MANUAL', 'texto', 'Provedor de comunicação'),
  ('comunicacao.numero_remetente', '', 'texto', 'Número remetente das mensagens'),
  ('comunicacao.webhook_url', '', 'texto', 'Endpoint de webhook da comunicação'),
  ('acesso.integracao_ativa', 'false', 'booleano', 'Ativa integração de controle de acesso'),
  ('acesso.tipo', 'MANUAL', 'texto', 'Tipo de controle de acesso'),
  ('acesso.endpoint', '', 'texto', 'Endpoint do dispositivo de acesso'),
  ('acesso.chave_dispositivo', '', 'texto', 'Chave do dispositivo de acesso'),
  ('marketplaces.wellhub_ativo', 'false', 'booleano', 'Ativa convênio Wellhub'),
  ('marketplaces.totalpass_ativo', 'false', 'booleano', 'Ativa convênio TotalPass')
) AS c(chave, valor, tipo, descricao)
ON CONFLICT (empresa_id, chave) DO NOTHING;

COMMIT;
