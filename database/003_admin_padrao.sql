CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_empresa_id UUID := '00000000-0000-0000-0000-000000000001';
    v_filial_id  UUID := '00000000-0000-0000-0000-000000000101';
    v_grupo_id   UUID := '00000000-0000-0000-0000-000000000201';
    v_usuario_id UUID := '00000000-0000-0000-0000-000000000301';
BEGIN
    INSERT INTO empresas (id, nome, cnpj, status, created_at, updated_at)
    VALUES (v_empresa_id, 'Dumbells', '00000000000000', 'ATIVA', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, updated_at = NOW();

    INSERT INTO filiais (id, empresa_id, nome, cidade, uf, status, created_at, updated_at)
    VALUES (v_filial_id, v_empresa_id, 'Dumbells Matriz', 'São Luís', 'MA', 'ATIVA', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, updated_at = NOW();

    INSERT INTO grupos_usuarios (id, empresa_id, nome, descricao, is_admin, status, created_at, updated_at)
    VALUES (v_grupo_id, v_empresa_id, 'Administrador', 'Grupo com acesso total ao sistema', TRUE, 'ATIVO', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, is_admin = TRUE, status = 'ATIVO', updated_at = NOW();

    INSERT INTO grupo_permissoes (grupo_id, permissao_id, created_at)
    SELECT v_grupo_id, p.id, NOW()
    FROM permissoes p
    ON CONFLICT (grupo_id, permissao_id) DO NOTHING;

    INSERT INTO usuarios (id, empresa_id, grupo_id, nome, email, senha_hash, status, created_at, updated_at)
    VALUES (
        v_usuario_id,
        v_empresa_id,
        v_grupo_id,
        'Administrador',
        'admin@dumbells.com.br',
        crypt('Admin@123', gen_salt('bf')),
        'ATIVO',
        NOW(),
        NOW()
    )
    ON CONFLICT (empresa_id, email) DO UPDATE SET
        nome = EXCLUDED.nome,
        grupo_id = EXCLUDED.grupo_id,
        senha_hash = EXCLUDED.senha_hash,
        status = 'ATIVO',
        updated_at = NOW();

    INSERT INTO usuario_filiais (usuario_id, filial_id, created_at)
    VALUES (v_usuario_id, v_filial_id, NOW())
    ON CONFLICT (usuario_id, filial_id) DO NOTHING;
END $$;
