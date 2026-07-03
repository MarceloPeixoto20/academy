from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal
import uuid

from flask import Blueprint, jsonify, request, g
from sqlalchemy import func, or_
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from ..extensions import db
from ..models import Aluno, AlunoPlano, Cobranca, ConfiguracaoSistema, Filial, Plano
from ..routes.operacional import CrmOportunidade, Indicacao, Colaborador
from ..utils.auth import permission_required, apply_filial_scope, get_user_filial_ids, ensure_filial_allowed
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot
from ..services.financeiro import calcula_total, vencimento_mes

academy_ext_bp = Blueprint("academy_ext", __name__)


class CrmEtapa(db.Model):
    __tablename__ = "crm_etapas"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    nome = db.Column(db.Text, nullable=False)
    codigo = db.Column(db.Text, nullable=False)
    ordem = db.Column(db.Integer, nullable=False, default=1)
    cor = db.Column(db.Text)
    probabilidade_padrao = db.Column(db.Integer, nullable=False, default=0)
    campos_obrigatorios = db.Column(ARRAY(db.Text), nullable=False, default=[])
    status = db.Column(db.Text, nullable=False, default="ATIVO")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class IndicacaoCampanha(db.Model):
    __tablename__ = "indicacao_campanhas"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    filial_id = db.Column(UUID(as_uuid=True), db.ForeignKey("filiais.id"))
    nome = db.Column(db.Text, nullable=False)
    descricao = db.Column(db.Text)
    slug = db.Column(db.Text, nullable=False)
    recompensa_aluno_tipo = db.Column(db.Text, nullable=False, default="DESCONTO_MENSALIDADE")
    recompensa_aluno_valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    recompensa_colaborador_tipo = db.Column(db.Text, nullable=False, default="VALOR_FIXO")
    recompensa_colaborador_valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    inicio = db.Column(db.Date)
    fim = db.Column(db.Date)
    sem_fim = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.Text, nullable=False, default="ATIVA")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)


class CobrancaLote(db.Model):
    __tablename__ = "cobranca_lotes"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = db.Column(UUID(as_uuid=True), db.ForeignKey("empresas.id"), nullable=False)
    usuario_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuarios.id"))
    ano = db.Column(db.Integer, nullable=False)
    mes = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Text, nullable=False, default="PREVIA")
    quantidade_prevista = db.Column(db.Integer, nullable=False, default=0)
    quantidade_gerada = db.Column(db.Integer, nullable=False, default=0)
    valor_total_previsto = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    valor_total_gerado = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    filtros = db.Column(JSONB)
    preview = db.Column(JSONB)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    confirmado_at = db.Column(db.DateTime(timezone=True))
    cancelado_at = db.Column(db.DateTime(timezone=True))


CRM_FIELDS = ["nome", "codigo", "ordem", "cor", "probabilidade_padrao", "campos_obrigatorios", "status"]
CAMPANHA_FIELDS = ["filial_id", "nome", "descricao", "slug", "recompensa_aluno_tipo", "recompensa_aluno_valor", "recompensa_colaborador_tipo", "recompensa_colaborador_valor", "inicio", "fim", "sem_fim", "status"]
CONFIG_DEFAULTS = {
    "inadimplencia.bloqueio_automatico_ativo": "false",
    "inadimplencia.dias_atraso_bloqueio": "10",
    "balanca.integracao_ativa": "false",
    "balanca.modo": "MANUAL",
    "balanca.endpoint": "",
    "balanca.porta_serial": "",
}


def _decimal(value):
    if value in (None, ""):
        return Decimal("0")
    return Decimal(str(value).replace(",", "."))


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    return datetime.strptime(value[:10], "%Y-%m-%d").date()


def _as_string_list(values):
    return [str(value) for value in (values or [])]


def _get_config(chave):
    item = ConfiguracaoSistema.query.filter_by(empresa_id=g.current_user.empresa_id, chave=chave).first()
    return item.valor if item else CONFIG_DEFAULTS.get(chave, "")


def _set_config(chave, valor):
    item = ConfiguracaoSistema.query.filter_by(empresa_id=g.current_user.empresa_id, chave=chave).first()
    if not item:
        item = ConfiguracaoSistema(empresa_id=g.current_user.empresa_id, chave=chave, tipo="texto")
        db.session.add(item)
    item.valor = str(valor)
    return item


def _preview_cobrancas(ano, mes, filial_ids=None):
    query = db.session.query(AlunoPlano, Aluno, Plano).join(Aluno, Aluno.id == AlunoPlano.aluno_id).join(Plano, Plano.id == AlunoPlano.plano_id).filter(Aluno.status == "ATIVO", AlunoPlano.status == "ATIVO", Aluno.empresa_id == g.current_user.empresa_id)
    if filial_ids:
        query = query.filter(Aluno.filial_id.in_(filial_ids))
    itens = []
    total = Decimal("0")
    comp = date(ano, mes, 1)
    for aluno_plano, aluno, plano in query.all():
        existente = Cobranca.query.filter_by(aluno_id=aluno.id, aluno_plano_id=aluno_plano.id, competencia=comp).first()
        valor_original, desconto, valor_total = calcula_total(aluno_plano.valor_mensal, aluno_plano.desconto_valor, aluno_plano.desconto_percentual)
        item = {
            "aluno_id": str(aluno.id),
            "aluno_nome": aluno.nome,
            "plano_id": str(plano.id),
            "plano_nome": plano.nome,
            "aluno_plano_id": str(aluno_plano.id),
            "filial_id": str(aluno.filial_id),
            "vencimento": vencimento_mes(ano, mes, aluno_plano.dia_vencimento).isoformat(),
            "valor_original": float(valor_original),
            "valor_desconto": float(desconto),
            "valor_total": float(valor_total),
            "existente": bool(existente),
        }
        itens.append(item)
        if not existente:
            total += valor_total
    return itens, total


@academy_ext_bp.get("/configuracoes/automacoes")
@permission_required("configuracoes.visualizar")
def get_automation_configs():
    return jsonify({key: _get_config(key) for key in CONFIG_DEFAULTS})


@academy_ext_bp.post("/configuracoes/automacoes")
@permission_required("configuracoes.editar")
def save_automation_configs():
    data = request.get_json() or {}
    for key in CONFIG_DEFAULTS:
        if key in data:
            _set_config(key, data.get(key))
    audit_log("UPDATE_AUTOMATION_CONFIGS", "configuracoes_sistema", None, None, data)
    db.session.commit()
    return jsonify({key: _get_config(key) for key in CONFIG_DEFAULTS})


@academy_ext_bp.post("/inadimplencia/aplicar-bloqueio")
@permission_required("configuracoes.bloqueio")
def aplicar_bloqueio_inadimplentes():
    ativo = _get_config("inadimplencia.bloqueio_automatico_ativo") == "true"
    dias = int(_get_config("inadimplencia.dias_atraso_bloqueio") or 10)
    if not ativo:
        return jsonify({"bloqueados": 0, "message": "Bloqueio automático está desativado"})
    limite = date.today().toordinal() - dias
    vencimento_limite = date.fromordinal(limite)
    query = apply_filial_scope(Cobranca.query, Cobranca, g.current_user).filter(Cobranca.status.in_(["ABERTO", "ATRASADO"]), Cobranca.vencimento < vencimento_limite)
    aluno_ids = {row.aluno_id for row in query.all()}
    bloqueados = 0
    for aluno_id in aluno_ids:
        aluno = apply_filial_scope(Aluno.query, Aluno, g.current_user).filter(Aluno.id == aluno_id, Aluno.status == "ATIVO").first()
        if aluno:
            aluno.status = "BLOQUEADO"
            bloqueados += 1
    audit_log("AUTO_BLOCK_DELINQUENT_STUDENTS", "alunos", None, None, {"bloqueados": bloqueados, "dias": dias})
    db.session.commit()
    return jsonify({"bloqueados": bloqueados})


@academy_ext_bp.get("/crm/etapas")
@permission_required("crm.visualizar")
def list_crm_etapas():
    rows = CrmEtapa.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(CrmEtapa.ordem).all()
    return jsonify([model_to_dict(row) for row in rows])


@academy_ext_bp.post("/crm/etapas")
@permission_required("crm.configurar")
def create_crm_etapa():
    data = request.get_json() or {}
    row = CrmEtapa(empresa_id=g.current_user.empresa_id)
    update_model_from_json(row, data, CRM_FIELDS)
    db.session.add(row)
    db.session.flush()
    audit_log("CREATE_CRM_STAGE", "crm_etapas", row.id, None, snapshot(row))
    db.session.commit()
    return jsonify(model_to_dict(row)), 201


@academy_ext_bp.put("/crm/etapas/<uuid:etapa_id>")
@permission_required("crm.configurar")
def update_crm_etapa(etapa_id):
    row = CrmEtapa.query.filter_by(id=etapa_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old = snapshot(row)
    update_model_from_json(row, request.get_json() or {}, CRM_FIELDS)
    audit_log("UPDATE_CRM_STAGE", "crm_etapas", row.id, old, snapshot(row))
    db.session.commit()
    return jsonify(model_to_dict(row))


@academy_ext_bp.post("/crm/oportunidades/<uuid:oportunidade_id>/mover")
@permission_required("crm.editar")
def mover_oportunidade(oportunidade_id):
    data = request.get_json() or {}
    etapa = CrmEtapa.query.filter_by(id=data.get("etapa_id"), empresa_id=g.current_user.empresa_id, status="ATIVO").first_or_404()
    oportunidade = apply_filial_scope(CrmOportunidade.query, CrmOportunidade, g.current_user).filter(CrmOportunidade.id == oportunidade_id).first_or_404()
    missing = [field for field in etapa.campos_obrigatorios or [] if not getattr(oportunidade, field, None)]
    if missing:
        return jsonify({"error": "Campos obrigatórios para esta etapa", "missing": missing}), 400
    old = snapshot(oportunidade)
    oportunidade.etapa = etapa.codigo
    oportunidade.probabilidade = etapa.probabilidade_padrao
    if etapa.codigo == "GANHO":
        oportunidade.ganhou_at = datetime.utcnow()
    if etapa.codigo == "PERDIDO":
        oportunidade.perdeu_at = datetime.utcnow()
    audit_log("MOVE_CRM_OPPORTUNITY", "crm_oportunidades", oportunidade.id, old, snapshot(oportunidade))
    db.session.commit()
    return jsonify(model_to_dict(oportunidade))


@academy_ext_bp.get("/indicacoes/campanhas")
@permission_required("indicacoes.campanhas")
def list_campanhas():
    rows = IndicacaoCampanha.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(IndicacaoCampanha.created_at.desc()).all()
    return jsonify([model_to_dict(row) for row in rows])


@academy_ext_bp.post("/indicacoes/campanhas")
@permission_required("indicacoes.campanhas")
def create_campanha():
    data = request.get_json() or {}
    row = IndicacaoCampanha(empresa_id=g.current_user.empresa_id)
    update_model_from_json(row, data, CAMPANHA_FIELDS)
    db.session.add(row)
    db.session.flush()
    audit_log("CREATE_REFERRAL_CAMPAIGN", "indicacao_campanhas", row.id, None, snapshot(row))
    db.session.commit()
    return jsonify(model_to_dict(row)), 201


@academy_ext_bp.post("/indicacoes/link/<uuid:campanha_id>")
@permission_required("indicacoes.campanhas")
def gerar_link_indicacao(campanha_id):
    data = request.get_json() or {}
    indicador_tipo = data.get("indicador_tipo")
    indicador_id = data.get("indicador_id")
    token = f"{indicador_tipo}:{indicador_id}:{campanha_id}"
    link = f"/indicar/{campanha_id}/{token}"
    return jsonify({"token": token, "link": link})


@academy_ext_bp.post("/public/indicacoes/<uuid:campanha_id>/<path:token>")
def public_indicacao(campanha_id, token):
    campanha = IndicacaoCampanha.query.filter_by(id=campanha_id, status="ATIVA").first_or_404()
    hoje = date.today()
    if campanha.inicio and campanha.inicio > hoje:
        return jsonify({"error": "Campanha ainda não iniciou"}), 400
    if not campanha.sem_fim and campanha.fim and campanha.fim < hoje:
        return jsonify({"error": "Campanha encerrada"}), 400
    data = request.get_json() or {}
    parts = token.split(":")
    indicador_tipo, indicador_id = (parts[0], parts[1]) if len(parts) >= 2 else (None, None)
    indicacao = Indicacao(
        empresa_id=campanha.empresa_id,
        filial_id=campanha.filial_id,
        campanha_id=campanha.id,
        token_indicador=token,
        origem="LINK",
        indicador_tipo=indicador_tipo or "ALUNO",
        aluno_indicador_id=indicador_id if indicador_tipo == "ALUNO" else None,
        colaborador_indicador_id=indicador_id if indicador_tipo == "COLABORADOR" else None,
        indicado_nome=data.get("nome"),
        indicado_contato=data.get("telefone"),
        indicado_email=data.get("email"),
        recompensa_tipo=campanha.recompensa_aluno_tipo if indicador_tipo == "ALUNO" else campanha.recompensa_colaborador_tipo,
        recompensa_valor=campanha.recompensa_aluno_valor if indicador_tipo == "ALUNO" else campanha.recompensa_colaborador_valor,
        status="PENDENTE",
        observacoes=data.get("observacoes"),
    )
    db.session.add(indicacao)
    db.session.commit()
    return jsonify({"message": "Indicação enviada com sucesso"}), 201


@academy_ext_bp.post("/financeiro/lotes/preview")
@permission_required("financeiro.lotes")
def preview_lote_cobrancas():
    data = request.get_json() or {}
    hoje = date.today()
    ano = int(data.get("ano") or hoje.year)
    mes = int(data.get("mes") or hoje.month)
    filial_ids = data.get("filial_ids") or get_user_filial_ids(g.current_user)
    filial_ids = _as_string_list(filial_ids)
    itens, total = _preview_cobrancas(ano, mes, filial_ids)
    lote = CobrancaLote(
        empresa_id=g.current_user.empresa_id,
        usuario_id=g.current_user.id,
        ano=ano,
        mes=mes,
        status="PREVIA",
        quantidade_prevista=len([i for i in itens if not i["existente"]]),
        valor_total_previsto=total,
        filtros={"filial_ids": filial_ids},
        preview=itens,
    )
    db.session.add(lote)
    db.session.commit()
    return jsonify(model_to_dict(lote))


@academy_ext_bp.post("/financeiro/lotes/<uuid:lote_id>/confirmar")
@permission_required("financeiro.lotes")
def confirmar_lote(lote_id):
    lote = CobrancaLote.query.filter_by(id=lote_id, empresa_id=g.current_user.empresa_id).first_or_404()
    if lote.status != "PREVIA":
        return jsonify({"error": "Apenas lotes em prévia podem ser confirmados"}), 400
    comp = date(lote.ano, lote.mes, 1)
    geradas = 0
    total = Decimal("0")
    for item in lote.preview or []:
        if item.get("existente"):
            continue
        existente = Cobranca.query.filter_by(aluno_id=item["aluno_id"], aluno_plano_id=item["aluno_plano_id"], competencia=comp).first()
        if existente:
            continue
        cobranca = Cobranca(empresa_id=g.current_user.empresa_id, filial_id=item["filial_id"], aluno_id=item["aluno_id"], aluno_plano_id=item["aluno_plano_id"], competencia=comp, valor_original=item["valor_original"], valor_desconto=item["valor_desconto"], valor_multa=0, valor_juros=0, valor_total=item["valor_total"], vencimento=_parse_date(item["vencimento"]), status="ABERTO", forma_pagamento_preferida="BOLETO", lote_id=lote.id)
        db.session.add(cobranca)
        geradas += 1
        total += _decimal(item["valor_total"])
    lote.status = "GERADO"
    lote.quantidade_gerada = geradas
    lote.valor_total_gerado = total
    lote.confirmado_at = datetime.utcnow()
    db.session.commit()
    return jsonify(model_to_dict(lote))


@academy_ext_bp.post("/financeiro/lotes/<uuid:lote_id>/cancelar")
@permission_required("financeiro.lotes")
def cancelar_lote(lote_id):
    lote = CobrancaLote.query.filter_by(id=lote_id, empresa_id=g.current_user.empresa_id).first_or_404()
    rows = Cobranca.query.filter_by(lote_id=lote.id, status="ABERTO").all()
    for cobranca in rows:
        cobranca.status = "CANCELADO"
        cobranca.cancelado_at = datetime.utcnow()
    lote.status = "CANCELADO"
    lote.cancelado_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"lote": model_to_dict(lote), "cobrancas_canceladas": len(rows)})
