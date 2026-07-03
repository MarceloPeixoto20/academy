from datetime import datetime
from decimal import Decimal, InvalidOperation
import uuid

from flask import Blueprint, jsonify, request, g
from sqlalchemy import func, or_
from sqlalchemy.dialects.postgresql import UUID

from ..extensions import db
from ..models import Aluno, Filial
from ..utils.auth import permission_required, apply_filial_scope, ensure_filial_allowed
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

operacional_bp = Blueprint("operacional", __name__)


class Colaborador(db.Model):
    __tablename__ = "colaboradores"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"))
    nome = db.Column(db.Text, nullable=False)
    cpf = db.Column(db.Text)
    telefone = db.Column(db.Text)
    whatsapp = db.Column(db.Text)
    email = db.Column(db.Text)
    cargo = db.Column(db.Text)
    tipo = db.Column(db.Text, nullable=False, default="FUNCIONARIO")
    forma_remuneracao = db.Column(db.Text, nullable=False, default="FIXO")
    valor_base = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    data_admissao = db.Column(db.Date)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class HorarioFuncionamento(db.Model):
    __tablename__ = "horarios_funcionamento"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), nullable=False)
    dia_semana = db.Column(db.Text, nullable=False)
    abre = db.Column(db.Boolean, nullable=False, default=True)
    hora_abertura = db.Column(db.Time)
    hora_fechamento = db.Column(db.Time)
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class Modalidade(db.Model):
    __tablename__ = "modalidades"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"))
    nome = db.Column(db.Text, nullable=False)
    descricao = db.Column(db.Text)
    capacidade_padrao = db.Column(db.Integer)
    status = db.Column(db.Text, nullable=False, default="ATIVA")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class ModalidadeHorario(db.Model):
    __tablename__ = "modalidade_horarios"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"), nullable=False)
    modalidade_id = db.Column(UUID(as_uuid=True), db.ForeignKey("modalidades.id"), nullable=False)
    colaborador_id = db.Column(UUID(as_uuid=True), db.ForeignKey("colaboradores.id"))
    dia_semana = db.Column(db.Text, nullable=False)
    hora_inicio = db.Column(db.Time, nullable=False)
    hora_fim = db.Column(db.Time, nullable=False)
    sala = db.Column(db.Text)
    capacidade = db.Column(db.Integer)
    remuneracao_tipo = db.Column(db.Text, nullable=False, default="POR_SESSAO")
    remuneracao_valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class Indicacao(db.Model):
    __tablename__ = "indicacoes"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"))
    indicador_tipo = db.Column(db.Text, nullable=False)
    aluno_indicador_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"))
    colaborador_indicador_id = db.Column(UUID(as_uuid=True), db.ForeignKey("colaboradores.id"))
    indicado_nome = db.Column(db.Text, nullable=False)
    indicado_contato = db.Column(db.Text)
    indicado_email = db.Column(db.Text)
    oportunidade_id = db.Column(UUID(as_uuid=True), db.ForeignKey("crm_oportunidades.id"))
    aluno_indicado_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"))
    status = db.Column(db.Text, nullable=False, default="PENDENTE")
    recompensa_tipo = db.Column(db.Text, nullable=False, default="DESCONTO_MENSALIDADE")
    recompensa_valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    competencia_desconto = db.Column(db.Text)
    pago_at = db.Column(db.DateTime(timezone=True))
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class CrmOportunidade(db.Model):
    __tablename__ = "crm_oportunidades"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"))
    aluno_id = db.Column(UUID(as_uuid=True), db.ForeignKey("alunos.id"))
    responsavel_usuario_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuarios.id"))
    nome = db.Column(db.Text, nullable=False)
    telefone = db.Column(db.Text)
    email = db.Column(db.Text)
    origem = db.Column(db.Text)
    etapa = db.Column(db.Text, nullable=False, default="NOVO")
    temperatura = db.Column(db.Text, nullable=False, default="MORNO")
    valor_previsto = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    probabilidade = db.Column(db.Integer, nullable=False, default=0)
    proximo_contato = db.Column(db.Date)
    observacoes = db.Column(db.Text)
    perda_motivo = db.Column(db.Text)
    ganhou_at = db.Column(db.DateTime(timezone=True))
    perdeu_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


FIELDS = {
    "colaboradores": ["filial_id", "nome", "cpf", "telefone", "whatsapp", "email", "cargo", "tipo", "forma_remuneracao", "valor_base", "status", "data_admissao", "observacoes"],
    "horarios_funcionamento": ["filial_id", "dia_semana", "abre", "hora_abertura", "hora_fechamento", "observacoes"],
    "modalidades": ["filial_id", "nome", "descricao", "capacidade_padrao", "status"],
    "modalidade_horarios": ["filial_id", "modalidade_id", "colaborador_id", "dia_semana", "hora_inicio", "hora_fim", "sala", "capacidade", "remuneracao_tipo", "remuneracao_valor", "status", "observacoes"],
    "indicacoes": ["filial_id", "indicador_tipo", "aluno_indicador_id", "colaborador_indicador_id", "indicado_nome", "indicado_contato", "indicado_email", "oportunidade_id", "aluno_indicado_id", "status", "recompensa_tipo", "recompensa_valor", "competencia_desconto", "observacoes"],
    "crm_oportunidades": ["filial_id", "aluno_id", "responsavel_usuario_id", "nome", "telefone", "email", "origem", "etapa", "temperatura", "valor_previsto", "probabilidade", "proximo_contato", "observacoes", "perda_motivo"],
}

MODEL_MAP = {
    "colaboradores": Colaborador,
    "horarios-funcionamento": HorarioFuncionamento,
    "modalidades": Modalidade,
    "modalidade-horarios": ModalidadeHorario,
    "indicacoes": Indicacao,
    "crm/oportunidades": CrmOportunidade,
}

MODEL_FIELDS_KEY = {
    "colaboradores": "colaboradores",
    "horarios-funcionamento": "horarios_funcionamento",
    "modalidades": "modalidades",
    "modalidade-horarios": "modalidade_horarios",
    "indicacoes": "indicacoes",
    "crm/oportunidades": "crm_oportunidades",
}

TIME_FIELDS = {"hora_abertura", "hora_fechamento", "hora_inicio", "hora_fim"}
NUMERIC_FIELDS = {"valor_base", "remuneracao_valor", "recompensa_valor", "valor_previsto"}
INTEGER_FIELDS = {"capacidade", "capacidade_padrao", "probabilidade"}


def _parse_decimal(value):
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _normalize_payload(data):
    normalized = dict(data or {})
    for field in TIME_FIELDS:
        if normalized.get(field):
            normalized[field] = datetime.strptime(normalized[field], "%H:%M").time()
    for field in NUMERIC_FIELDS:
        if field in normalized:
            normalized[field] = _parse_decimal(normalized.get(field))
    for field in INTEGER_FIELDS:
        if normalized.get(field) in (None, ""):
            normalized[field] = None
        elif field in normalized:
            normalized[field] = int(normalized[field])
    for key, value in list(normalized.items()):
        if value == "":
            normalized[key] = None
    return normalized


def _validate_filial(filial_id):
    if not filial_id:
        return True
    return ensure_filial_allowed(g.current_user, filial_id)


def _base_query(model):
    query = model.query.filter_by(empresa_id=g.current_user.empresa_id)
    if hasattr(model, "filial_id"):
        query = apply_filial_scope(query, model, g.current_user)
    return query


def _serialize(row):
    item = model_to_dict(row)
    if getattr(row, "filial_id", None):
        filial = Filial.query.filter_by(id=row.filial_id, empresa_id=g.current_user.empresa_id).first()
        item["filial_nome"] = filial.nome if filial else None
    if isinstance(row, ModalidadeHorario):
        modalidade = Modalidade.query.filter_by(id=row.modalidade_id, empresa_id=g.current_user.empresa_id).first()
        colaborador = Colaborador.query.filter_by(id=row.colaborador_id, empresa_id=g.current_user.empresa_id).first() if row.colaborador_id else None
        item["modalidade_nome"] = modalidade.nome if modalidade else None
        item["colaborador_nome"] = colaborador.nome if colaborador else None
    if isinstance(row, Indicacao):
        aluno = Aluno.query.filter_by(id=row.aluno_indicador_id, empresa_id=g.current_user.empresa_id).first() if row.aluno_indicador_id else None
        colaborador = Colaborador.query.filter_by(id=row.colaborador_indicador_id, empresa_id=g.current_user.empresa_id).first() if row.colaborador_indicador_id else None
        item["indicador_nome"] = aluno.nome if aluno else (colaborador.nome if colaborador else None)
    return item


def _get_config(key):
    model = MODEL_MAP[key]
    fields = FIELDS[MODEL_FIELDS_KEY[key]]
    return model, fields


@operacional_bp.get("/<path:resource>")
@permission_required("operacional.visualizar")
def list_resource(resource):
    model, _ = _get_config(resource)
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "").strip()
    filial_id = request.args.get("filial_id", "").strip()
    query = _base_query(model)
    if filial_id and hasattr(model, "filial_id"):
        query = query.filter(model.filial_id == filial_id)
    if status and hasattr(model, "status"):
        query = query.filter(model.status == status)
    if q and hasattr(model, "nome"):
        query = query.filter(model.nome.ilike(f"%{q}%"))
    rows = query.order_by(getattr(model, "created_at").desc()).limit(1000).all()
    return jsonify([_serialize(row) for row in rows])


@operacional_bp.post("/<path:resource>")
@permission_required("operacional.editar")
def create_resource(resource):
    model, fields = _get_config(resource)
    data = _normalize_payload(request.get_json() or {})
    if hasattr(model, "filial_id") and not _validate_filial(data.get("filial_id")):
        return jsonify({"error": "Usuário não tem acesso a essa filial"}), 403
    row = model(empresa_id=g.current_user.empresa_id)
    update_model_from_json(row, data, fields)
    db.session.add(row)
    db.session.flush()
    audit_log("CREATE", resource, row.id, None, snapshot(row))
    db.session.commit()
    return jsonify(_serialize(row)), 201


@operacional_bp.put("/<path:resource>/<uuid:item_id>")
@permission_required("operacional.editar")
def update_resource(resource, item_id):
    model, fields = _get_config(resource)
    row = _base_query(model).filter(model.id == item_id).first_or_404()
    old = snapshot(row)
    data = _normalize_payload(request.get_json() or {})
    if hasattr(model, "filial_id") and "filial_id" in data and not _validate_filial(data.get("filial_id")):
        return jsonify({"error": "Usuário não tem acesso a essa filial"}), 403
    update_model_from_json(row, data, fields)
    audit_log("UPDATE", resource, row.id, old, snapshot(row))
    db.session.commit()
    return jsonify(_serialize(row))


@operacional_bp.get("/modalidades/grade")
@permission_required("operacional.visualizar")
def grade_modalidades():
    filial_id = request.args.get("filial_id", "").strip()
    query = _base_query(ModalidadeHorario).filter(ModalidadeHorario.status == "ATIVO")
    if filial_id:
        query = query.filter(ModalidadeHorario.filial_id == filial_id)
    rows = query.order_by(ModalidadeHorario.dia_semana, ModalidadeHorario.hora_inicio).all()
    return jsonify([_serialize(row) for row in rows])


@operacional_bp.get("/crm/dashboard")
@permission_required("crm.visualizar")
def crm_dashboard():
    query = _base_query(CrmOportunidade)
    total = query.count()
    por_etapa = dict(query.with_entities(CrmOportunidade.etapa, func.count(CrmOportunidade.id)).group_by(CrmOportunidade.etapa).all())
    valor_aberto = query.filter(~CrmOportunidade.etapa.in_(["GANHO", "PERDIDO"])).with_entities(func.coalesce(func.sum(CrmOportunidade.valor_previsto), 0)).scalar()
    ganhos = query.filter(CrmOportunidade.etapa == "GANHO").count()
    perdidos = query.filter(CrmOportunidade.etapa == "PERDIDO").count()
    return jsonify({
        "total": total,
        "por_etapa": por_etapa,
        "valor_aberto": float(valor_aberto or 0),
        "ganhos": ganhos,
        "perdidos": perdidos,
    })


@operacional_bp.get("/crm/kanban")
@permission_required("crm.visualizar")
def crm_kanban():
    etapas = ["NOVO", "CONTATO", "AGENDADO", "NEGOCIACAO", "GANHO", "PERDIDO"]
    rows = _base_query(CrmOportunidade).order_by(CrmOportunidade.updated_at.desc()).limit(1000).all()
    board = {etapa: [] for etapa in etapas}
    for row in rows:
        board.setdefault(row.etapa, []).append(_serialize(row))
    return jsonify(board)
