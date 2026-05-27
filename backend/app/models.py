from datetime import datetime, date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import CheckConstraint, UniqueConstraint
from .extensions import db
import uuid

def uuid_pk():
    return str(uuid.uuid4())

class Empresa(db.Model):
    __tablename__ = "empresas"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = db.Column(db.Text, nullable=False)
    cnpj = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, default="ATIVA")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Filial(db.Model):
    __tablename__ = "filiais"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    nome = db.Column(db.Text, nullable=False)
    cnpj = db.Column(db.Text)
    telefone = db.Column(db.Text)
    email = db.Column(db.Text)
    cep = db.Column(db.Text)
    endereco = db.Column(db.Text)
    numero = db.Column(db.Text)
    complemento = db.Column(db.Text)
    bairro = db.Column(db.Text)
    cidade = db.Column(db.Text)
    uf = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, default="ATIVA")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class GrupoUsuario(db.Model):
    __tablename__ = "grupos_usuarios"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    nome = db.Column(db.Text, nullable=False)
    descricao = db.Column(db.Text)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Permissao(db.Model):
    __tablename__ = "permissoes"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = db.Column(db.Text, nullable=False, unique=True)
    modulo = db.Column(db.Text, nullable=False)
    acao = db.Column(db.Text, nullable=False)
    descricao = db.Column(db.Text)
    is_visual = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class GrupoPermissao(db.Model):
    __tablename__ = "grupo_permissoes"
    grupo_id = db.Column(UUID(as_uuid=True), db.ForeignKey("grupos_usuarios.id"), primary_key=True)
    permissao_id = db.Column(UUID(as_uuid=True), db.ForeignKey("permissoes.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Usuario(db.Model):
    __tablename__ = "usuarios"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    grupo_id = db.Column(UUID(as_uuid=True), db.ForeignKey("grupos_usuarios.id"))
    nome = db.Column(db.Text, nullable=False)
    email = db.Column(db.Text, nullable=False)
    senha_hash = db.Column(db.Text, nullable=False)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    ultimo_login_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    grupo = db.relationship("GrupoUsuario", lazy="joined")
    __table_args__ = (UniqueConstraint("empresa_id", "email"),)

class UsuarioFilial(db.Model):
    __tablename__ = "usuario_filiais"
    usuario_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuarios.id"), primary_key=True)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Plano(db.Model):
    __tablename__ = "planos"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    nome = db.Column(db.Text, nullable=False)
    descricao = db.Column(db.Text)
    valor_mensal = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    duracao_meses = db.Column(db.Integer, nullable=False, default=1)
    multa_atraso_ativa = db.Column(db.Boolean, nullable=False, default=False)
    percentual_multa = db.Column(db.Numeric(8, 2), nullable=False, default=0)
    juros_dia = db.Column(db.Numeric(8, 2), nullable=False, default=0)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Aluno(db.Model):
    __tablename__ = "alunos"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), nullable=False)
    plano_id = db.Column(UUID(as_uuid=True), db.ForeignKey("planos.id"))
    nome = db.Column(db.Text, nullable=False)
    cpf = db.Column(db.Text, nullable=False)
    rg = db.Column(db.Text)
    data_nascimento = db.Column(db.Date)
    sexo = db.Column(db.Text)
    telefone = db.Column(db.Text)
    whatsapp = db.Column(db.Text)
    email = db.Column(db.Text)
    cep = db.Column(db.Text)
    endereco = db.Column(db.Text)
    numero = db.Column(db.Text)
    complemento = db.Column(db.Text)
    bairro = db.Column(db.Text)
    cidade = db.Column(db.Text)
    uf = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    data_cadastro = db.Column(db.Date, nullable=False, default=date.today)
    data_inicio = db.Column(db.Date)
    data_cancelamento = db.Column(db.Date)
    dia_vencimento = db.Column(db.Integer)
    desconto_valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    desconto_percentual = db.Column(db.Numeric(8, 2), nullable=False, default=0)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Treinador(db.Model):
    __tablename__ = "treinadores"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    nome = db.Column(db.Text, nullable=False)
    cpf = db.Column(db.Text, nullable=False)
    telefone = db.Column(db.Text)
    whatsapp = db.Column(db.Text)
    email = db.Column(db.Text)
    cep = db.Column(db.Text)
    endereco = db.Column(db.Text)
    numero = db.Column(db.Text)
    complemento = db.Column(db.Text)
    bairro = db.Column(db.Text)
    cidade = db.Column(db.Text)
    uf = db.Column(db.Text)
    cref = db.Column(db.Text)
    especialidade = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class TreinadorFilial(db.Model):
    __tablename__ = "treinador_filiais"
    treinador_id = db.Column(UUID(as_uuid=True), db.ForeignKey("treinadores.id"), primary_key=True)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class AlunoPlano(db.Model):
    __tablename__ = "aluno_planos"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aluno_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"), nullable=False)
    plano_id = db.Column(UUID(as_uuid=True), db.ForeignKey("planos.id"), nullable=False)
    valor_mensal = db.Column(db.Numeric(12, 2), nullable=False)
    dia_vencimento = db.Column(db.Integer, nullable=False)
    desconto_valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    desconto_percentual = db.Column(db.Numeric(8, 2), nullable=False, default=0)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    data_inicio = db.Column(db.Date, nullable=False, default=date.today)
    data_fim = db.Column(db.Date)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Cobranca(db.Model):
    __tablename__ = "cobrancas"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), nullable=False)
    aluno_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"), nullable=False)
    aluno_plano_id = db.Column(UUID(as_uuid=True), db.ForeignKey("aluno_planos.id"))
    valor_original = db.Column(db.Numeric(12, 2), nullable=False)
    valor_desconto = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    valor_multa = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    valor_juros = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    valor_total = db.Column(db.Numeric(12, 2), nullable=False)
    vencimento = db.Column(db.Date, nullable=False)
    status = db.Column(db.Text, nullable=False, default="ABERTO")
    forma_pagamento_preferida = db.Column(db.Text)
    asaas_id = db.Column(db.Text)
    codigo_barras = db.Column(db.Text)
    link_pagamento = db.Column(db.Text)
    pix_copia_cola = db.Column(db.Text)
    observacoes = db.Column(db.Text)
    recebido_at = db.Column(db.DateTime(timezone=True))
    cancelado_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Pagamento(db.Model):
    __tablename__ = "pagamentos"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cobranca_id = db.Column(UUID(as_uuid=True), db.ForeignKey("cobrancas.id"), nullable=False)
    usuario_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuarios.id"))
    valor_pago = db.Column(db.Numeric(12, 2), nullable=False)
    forma_pagamento = db.Column(db.Text, nullable=False)
    data_pagamento = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    gateway = db.Column(db.Text)
    gateway_payment_id = db.Column(db.Text)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class GrupoMuscular(db.Model):
    __tablename__ = "grupos_musculares"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"))
    nome = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Exercicio(db.Model):
    __tablename__ = "exercicios"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"))
    grupo_muscular_id = db.Column(UUID(as_uuid=True), db.ForeignKey("grupos_musculares.id"))
    nome = db.Column(db.Text, nullable=False)
    descricao = db.Column(db.Text)
    equipamento = db.Column(db.Text)
    video_url = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class Treino(db.Model):
    __tablename__ = "treinos"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), nullable=False)
    aluno_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"), nullable=False)
    treinador_id = db.Column(UUID(as_uuid=True), db.ForeignKey("treinadores.id"))
    nome = db.Column(db.Text, nullable=False)
    objetivo = db.Column(db.Text)
    nivel = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    data_inicio = db.Column(db.Date, nullable=False, default=date.today)
    data_fim = db.Column(db.Date)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class TreinoExercicio(db.Model):
    __tablename__ = "treino_exercicios"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    treino_id = db.Column(UUID(as_uuid=True), db.ForeignKey("treinos.id"), nullable=False)
    exercicio_id = db.Column(UUID(as_uuid=True), db.ForeignKey("exercicios.id"), nullable=False)
    grupo_treino = db.Column(db.Text)
    dia_semana = db.Column(db.Text)
    ordem = db.Column(db.Integer, nullable=False, default=1)
    series = db.Column(db.Integer)
    repeticoes = db.Column(db.Text)
    carga = db.Column(db.Text)
    descanso_segundos = db.Column(db.Integer)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class ConfiguracaoSistema(db.Model):
    __tablename__ = "configuracoes_sistema"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"))
    chave = db.Column(db.Text, nullable=False)
    valor = db.Column(db.Text)
    tipo = db.Column(db.Text, nullable=False, default="texto")
    descricao = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"))
    usuario_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuarios.id"))
    acao = db.Column(db.Text, nullable=False)
    entidade = db.Column(db.Text, nullable=False)
    entidade_id = db.Column(UUID(as_uuid=True))
    dados_antigos = db.Column(JSONB)
    dados_novos = db.Column(JSONB)
    ip = db.Column(db.Text)
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class AlunoMedida(db.Model):
    __tablename__ = "aluno_medidas"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), nullable=False)
    aluno_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"), nullable=False)
    data_avaliacao = db.Column(db.Date, nullable=False, default=date.today)
    peso_kg = db.Column(db.Numeric(6,2))
    altura_cm = db.Column(db.Numeric(6,2))
    pescoco_cm = db.Column(db.Numeric(6,2))
    ombro_cm = db.Column(db.Numeric(6,2))
    torax_cm = db.Column(db.Numeric(6,2))
    cintura_cm = db.Column(db.Numeric(6,2))
    abdomen_cm = db.Column(db.Numeric(6,2))
    quadril_cm = db.Column(db.Numeric(6,2))
    braco_direito_cm = db.Column(db.Numeric(6,2))
    braco_esquerdo_cm = db.Column(db.Numeric(6,2))
    antebraco_direito_cm = db.Column(db.Numeric(6,2))
    antebraco_esquerdo_cm = db.Column(db.Numeric(6,2))
    coxa_direita_cm = db.Column(db.Numeric(6,2))
    coxa_esquerda_cm = db.Column(db.Numeric(6,2))
    panturrilha_direita_cm = db.Column(db.Numeric(6,2))
    panturrilha_esquerda_cm = db.Column(db.Numeric(6,2))
    percentual_gordura = db.Column(db.Numeric(5,2))
    percentual_massa_magra = db.Column(db.Numeric(5,2))
    massa_muscular_kg = db.Column(db.Numeric(6,2))
    massa_gorda_kg = db.Column(db.Numeric(6,2))
    imc = db.Column(db.Numeric(6,2))
    pressao_arterial = db.Column(db.Text)
    frequencia_cardiaca = db.Column(db.Integer)
    objetivo = db.Column(db.Text)
    observacoes = db.Column(db.Text)
    responsavel_usuario_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuarios.id"))
    treinador_id = db.Column(UUID(as_uuid=True), db.ForeignKey("treinadores.id"))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
