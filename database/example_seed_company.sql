-- Use este arquivo apenas como exemplo.
-- A senha precisa ser gerada pelo backend usando bcrypt.
-- Não use senha_hash fake em produção.

INSERT INTO empresas (id, nome, cnpj)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dumbells', '00000000000000')
ON CONFLICT DO NOTHING;

INSERT INTO filiais (id, empresa_id, nome, cidade, uf)
VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Dumbells Centro', 'São Luís', 'MA'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Dumbells Cohama', 'São Luís', 'MA')
ON CONFLICT DO NOTHING;

INSERT INTO grupos_usuarios (id, empresa_id, nome, descricao, is_admin)
VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Administrador', 'Grupo com acesso total', true)
ON CONFLICT DO NOTHING;

INSERT INTO grupo_permissoes (grupo_id, permissao_id)
SELECT '00000000-0000-0000-0000-000000000201', id
FROM permissoes
ON CONFLICT DO NOTHING;
