# Sistema de Gerenciamento de Academia - Base Inicial

Base inicial para um sistema administrativo de academia com:

- Multiempresa e multifilial
- Permissões por módulo, ação e botão visual
- Login com JWT em cookie HttpOnly
- CSRF token para rotas protegidas
- Backend Flask
- Banco Supabase/PostgreSQL
- Frontend React/Vite
- Docker + Nginx
- Logs de auditoria
- Dashboard inicial por filial
- Estrutura preparada para financeiro, treinos, alunos, usuários e grupos

## Estrutura

```txt
academia-base/
├── backend/
├── frontend/
├── database/
├── nginx/
├── docker-compose.yml
└── README.md
```

## Como iniciar

### 1. Banco Supabase

No painel do Supabase, abra o SQL Editor e execute:

```txt
database/schema.sql
database/seed_permissions.sql
database/migrations/*.sql
```

### 2. Backend

Copie o arquivo de ambiente:

```bash
cp backend/.env.example backend/.env
```

Edite o `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:SENHA@HOST:5432/postgres
JWT_SECRET=troque_essa_chave
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

Rodar local:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask --app run.py run --host=0.0.0.0 --port=5000 --debug
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Docker

```bash
docker compose up --build
```

Acesse:

```txt
http://localhost:8080
```

## Segurança

- Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` ou senha do banco no React.
- O React chama apenas o backend.
- O backend valida permissões em todas as rotas sensíveis.
- O frontend apenas esconde botões visualmente, mas a proteção real fica no backend.
- JWT fica em cookie HttpOnly.
- Requisições POST/PUT/PATCH/DELETE exigem `X-CSRF-Token`.

## Permissões

Formato sugerido:

```txt
modulo.acao
modulo.botao.nome
```

Exemplos:

```txt
alunos.visualizar
alunos.criar
alunos.editar
alunos.excluir
alunos.alterar_status
dashboard.visualizar
dashboard.card_alunos_ativos
financeiro.gerar_cobranca
financeiro.baixar_pagamento
usuarios.criar
grupos.editar_permissoes
```

## Regra de filial

- Se o usuário tem filiais vinculadas, ele só vê dados dessas filiais.
- Se o usuário não tem filial vinculada, ele vê todas as filiais da empresa.
- Toda query sensível deve usar `apply_filial_scope`.

## Próximos módulos recomendados

1. CRUD completo de treinadores
2. CRUD completo de treinos/exercícios
3. Rotina automática de geração de cobranças
4. Integração Asaas
5. Tela avançada de permissões com checkboxes por módulo
6. Auditoria visual no painel admin
