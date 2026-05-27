INSERT INTO permissoes (codigo, modulo, acao, descricao, is_visual)
VALUES
('dashboard.visualizar','dashboard','visualizar','Acessar dashboard',false),
('dashboard.card_alunos_ativos','dashboard','card_alunos_ativos','Visualizar card de alunos ativos',true),
('dashboard.card_alunos_inativos','dashboard','card_alunos_inativos','Visualizar card de alunos inativos',true),
('dashboard.card_financeiro','dashboard','card_financeiro','Visualizar cards financeiros',true),

('alunos.visualizar','alunos','visualizar','Visualizar alunos',false),
('alunos.criar','alunos','criar','Criar alunos',false),
('alunos.editar','alunos','editar','Editar alunos',false),
('alunos.excluir','alunos','excluir','Excluir alunos',false),
('alunos.alterar_status','alunos','alterar_status','Alterar status do aluno',false),
('alunos.ver_financeiro','alunos','ver_financeiro','Ver financeiro do aluno',true),
('alunos.medidas.visualizar','alunos','medidas.visualizar','Visualizar medidas do aluno',false),
('alunos.medidas.criar','alunos','medidas.criar','Criar medidas do aluno',false),
('alunos.medidas.editar','alunos','medidas.editar','Editar medidas do aluno',false),
('alunos.medidas.excluir','alunos','medidas.excluir','Excluir medidas do aluno',false),

('treinadores.visualizar','treinadores','visualizar','Visualizar treinadores',false),
('treinadores.criar','treinadores','criar','Criar treinadores',false),
('treinadores.editar','treinadores','editar','Editar treinadores',false),
('treinadores.excluir','treinadores','excluir','Excluir treinadores',false),

('treinos.visualizar','treinos','visualizar','Visualizar treinos',false),
('treinos.criar','treinos','criar','Criar treinos',false),
('treinos.editar','treinos','editar','Editar treinos',false),
('treinos.excluir','treinos','excluir','Excluir treinos',false),

('exercicios.visualizar','exercicios','visualizar','Visualizar exercícios',false),
('exercicios.criar','exercicios','criar','Criar exercícios',false),
('exercicios.editar','exercicios','editar','Editar exercícios',false),
('exercicios.excluir','exercicios','excluir','Excluir exercícios',false),

('financeiro.visualizar','financeiro','visualizar','Visualizar financeiro',false),
('financeiro.gerar_cobranca','financeiro','gerar_cobranca','Gerar cobranças',false),
('financeiro.cancelar_cobranca','financeiro','cancelar_cobranca','Cancelar cobranças',false),
('financeiro.baixar_pagamento','financeiro','baixar_pagamento','Baixar pagamento manual',false),

('planos.visualizar','planos','visualizar','Visualizar planos',false),
('planos.criar','planos','criar','Criar planos',false),
('planos.editar','planos','editar','Editar planos',false),
('planos.excluir','planos','excluir','Excluir planos',false),

('usuarios.visualizar','usuarios','visualizar','Visualizar usuários',false),
('usuarios.criar','usuarios','criar','Criar usuários',false),
('usuarios.editar','usuarios','editar','Editar usuários',false),
('usuarios.excluir','usuarios','excluir','Excluir usuários',false),

('grupos.visualizar','grupos','visualizar','Visualizar grupos de usuários',false),
('grupos.criar','grupos','criar','Criar grupos',false),
('grupos.editar','grupos','editar','Editar grupos',false),
('grupos.editar_permissoes','grupos','editar_permissoes','Editar permissões dos grupos',false),

('configuracoes.visualizar','configuracoes','visualizar','Visualizar configurações',false),
('configuracoes.editar','configuracoes','editar','Editar configurações',false),
('logs.visualizar','logs','visualizar','Visualizar logs de auditoria',false)
ON CONFLICT (codigo) DO NOTHING;
