from datetime import date, datetime
from calendar import monthrange
from decimal import Decimal

from flask import Blueprint, jsonify, request, g
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Aluno, Plano, AlunoPlano, Cobranca, Pagamento
from ..utils.auth import permission_required, apply_filial_scope, ensure_filial_allowed
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

alunos_bp = Blueprint("alunos", __name__)

ALUNO_FIELDS = [
    "filial_id", "plano_id", "nome", "cpf", "rg", "data_nascimento", "sexo",
    "telefone", "whatsapp", "email", "cep", "endereco", "numero", "complemento",
    "bairro", "cidade", "uf", "status", "data_inicio", "data_cancelamento",
    "dia_vencimento", "desconto_valor", "desconto_percentual", "observacoes"
]


def _decimal(value):
    return Decimal(str(value or 0))


def _competencia_inicio(ano, mes):
    return date(int(ano), int(mes), 1)


def _vencimento_mes(ano, mes, dia):
    ultimo = monthrange(int(ano), int(mes))[1]
    return date(int(ano), int(mes), min(int(dia or 10), ultimo))


def _calcula_valores(valor_mensal, desconto_valor=0, desconto_percentual=0):
    valor = _decimal(valor_mensal)
    desc_valor = _decimal(desconto_valor)
    desc_percentual = _decimal(desconto_percentual)
    desconto_perc_valor = valor * desc_percentual / Decimal("100")
    desconto_total = desc_valor + desconto_perc_valor
    total = max(Decimal("0"), valor - desconto_total)
    return valor, desconto_total, total


def _get_aluno_or_404(aluno_id):
    return (
        apply_filial_scope(Aluno.query, Aluno, g.current_user)
        .filter(Aluno.id == aluno_id)
        .first_or_404()
    )


def _plano_ativo_do_aluno(aluno_id):
    return (
        AlunoPlano.query
        .filter_by(aluno_id=aluno_id, status="ATIVO")
        .order_by(AlunoPlano.created_at.desc())
        .first()
    )


@alunos_bp.get("/")
@permission_required("alunos.visualizar")
def list_alunos():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "").strip()

    query = apply_filial_scope(Aluno.query, Aluno, g.current_user)

    if q:
        like = f"%{q}%"
        query = query.filter((Aluno.nome.ilike(like)) | (Aluno.cpf.ilike(like)) | (Aluno.email.ilike(like)))

    if status:
        query = query.filter(Aluno.status == status)

    alunos = query.order_by(Aluno.created_at.desc()).limit(500).all()
    return jsonify([model_to_dict(a) for a in alunos])


@alunos_bp.get("/<uuid:aluno_id>")
@permission_required("alunos.visualizar")
def get_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    data = model_to_dict(aluno)

    aluno_plano = _plano_ativo_do_aluno(aluno.id)
    data["plano_ativo"] = model_to_dict(aluno_plano) if aluno_plano else None

    return jsonify(data)


@alunos_bp.post("/")
@permission_required("alunos.criar")
def create_aluno():
    data = request.get_json() or {}

    if not data.get("filial_id"):
        return jsonify({"error": "filial_id é obrigatório"}), 400

    if not ensure_filial_allowed(g.current_user, data["filial_id"]):
        return jsonify({"error": "Usuário não tem acesso a essa filial"}), 403

    status = data.get("status", "ATIVO")
    if status == "ATIVO" and not data.get("plano_id"):
        return jsonify({"error": "Aluno ativo precisa ter plano"}), 400

    aluno = Aluno(empresa_id=g.current_user.empresa_id)
    update_model_from_json(aluno, data, ALUNO_FIELDS)

    db.session.add(aluno)
    db.session.flush()

    if aluno.plano_id and aluno.status == "ATIVO":
        plano = Plano.query.filter_by(id=aluno.plano_id, empresa_id=g.current_user.empresa_id).first()
        if plano:
            db.session.add(AlunoPlano(
                aluno_id=aluno.id,
                plano_id=plano.id,
                valor_mensal=plano.valor_mensal,
                dia_vencimento=aluno.dia_vencimento or 10,
                desconto_valor=aluno.desconto_valor or 0,
                desconto_percentual=aluno.desconto_percentual or 0,
                status="ATIVO",
            ))

    audit_log("CREATE", "alunos", aluno.id, None, snapshot(aluno))

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Já existe aluno com esse CPF nesta empresa"}), 409

    return jsonify(model_to_dict(aluno)), 201


@alunos_bp.put("/<uuid:aluno_id>")
@permission_required("alunos.editar")
def update_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    old = snapshot(aluno)
    data = request.get_json() or {}

    if "filial_id" in data and not ensure_filial_allowed(g.current_user, data["filial_id"]):
        return jsonify({"error": "Usuário não tem acesso a essa filial"}), 403

    final_status = data.get("status", aluno.status)
    final_plano = data.get("plano_id", aluno.plano_id)
    if final_status == "ATIVO" and not final_plano:
        return jsonify({"error": "Aluno ativo precisa ter plano"}), 400

    update_model_from_json(aluno, data, ALUNO_FIELDS)
    audit_log("UPDATE", "alunos", aluno.id, old, snapshot(aluno))

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Já existe aluno com esse CPF nesta empresa"}), 409

    return jsonify(model_to_dict(aluno))


@alunos_bp.delete("/<uuid:aluno_id>")
@permission_required("alunos.excluir")
def delete_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    old = snapshot(aluno)
    aluno.status = "CANCELADO"
    audit_log("CANCEL", "alunos", aluno.id, old, snapshot(aluno))
    db.session.commit()
    return jsonify({"message": "Aluno cancelado. Cobranças em aberto foram mantidas."})


@alunos_bp.get("/<uuid:aluno_id>/plano")
@permission_required("alunos.visualizar")
def get_plano_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    plano = _plano_ativo_do_aluno(aluno.id)
    return jsonify(model_to_dict(plano) if plano else None)


@alunos_bp.post("/<uuid:aluno_id>/plano")
@permission_required("alunos.editar")
def set_plano_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    data = request.get_json() or {}

    plano_id = data.get("plano_id")
    if not plano_id:
        return jsonify({"error": "plano_id é obrigatório"}), 400

    plano = Plano.query.filter_by(id=plano_id, empresa_id=g.current_user.empresa_id).first()
    if not plano:
        return jsonify({"error": "Plano inválido"}), 400

    old_aluno = snapshot(aluno)
    old_plano_ativo = snapshot(_plano_ativo_do_aluno(aluno.id))

    AlunoPlano.query.filter_by(aluno_id=aluno.id, status="ATIVO").update({"status": "INATIVO"})

    valor_mensal = data.get("valor_mensal", plano.valor_mensal)
    dia_vencimento = data.get("dia_vencimento", aluno.dia_vencimento or 10)
    desconto_valor = data.get("desconto_valor", aluno.desconto_valor or 0)
    desconto_percentual = data.get("desconto_percentual", aluno.desconto_percentual or 0)

    novo = AlunoPlano(
        aluno_id=aluno.id,
        plano_id=plano.id,
        valor_mensal=valor_mensal,
        dia_vencimento=dia_vencimento,
        desconto_valor=desconto_valor,
        desconto_percentual=desconto_percentual,
        status="ATIVO",
        data_inicio=data.get("data_inicio") or date.today(),
    )
    db.session.add(novo)

    aluno.plano_id = plano.id
    aluno.dia_vencimento = dia_vencimento
    aluno.desconto_valor = desconto_valor
    aluno.desconto_percentual = desconto_percentual

    audit_log(
        "SET_STUDENT_PLAN",
        "aluno_planos",
        aluno.id,
        {"aluno": old_aluno, "plano_ativo": old_plano_ativo},
        {"aluno": snapshot(aluno), "novo_plano": model_to_dict(novo)}
    )

    db.session.commit()
    return jsonify({"aluno": model_to_dict(aluno), "plano_ativo": model_to_dict(novo)})


@alunos_bp.get("/<uuid:aluno_id>/financeiro/cobrancas")
@permission_required("financeiro.visualizar")
def get_cobrancas_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)

    rows = (
        Cobranca.query
        .filter_by(empresa_id=g.current_user.empresa_id, aluno_id=aluno.id)
        .order_by(Cobranca.vencimento.desc())
        .limit(300)
        .all()
    )
    return jsonify([model_to_dict(row) for row in rows])


@alunos_bp.post("/<uuid:aluno_id>/financeiro/gerar-cobranca")
@permission_required("financeiro.gerar_cobranca")
def gerar_cobranca_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    aluno_plano = _plano_ativo_do_aluno(aluno.id)

    if not aluno_plano:
        return jsonify({"error": "Aluno não possui plano ativo"}), 400

    data = request.get_json() or {}
    hoje = date.today()
    ano = int(data.get("ano") or hoje.year)
    mes = int(data.get("mes") or hoje.month)
    competencia = _competencia_inicio(ano, mes)

    existente = Cobranca.query.filter_by(
        aluno_id=aluno.id,
        aluno_plano_id=aluno_plano.id,
        competencia=competencia,
    ).first()

    if existente:
        return jsonify({"message": "Cobrança já existe para essa competência", "cobranca": model_to_dict(existente)}), 200

    valor_original, desconto, total = _calcula_valores(
        aluno_plano.valor_mensal,
        aluno_plano.desconto_valor,
        aluno_plano.desconto_percentual,
    )

    cobranca = Cobranca(
        empresa_id=g.current_user.empresa_id,
        filial_id=aluno.filial_id,
        aluno_id=aluno.id,
        aluno_plano_id=aluno_plano.id,
        competencia=competencia,
        valor_original=valor_original,
        valor_desconto=desconto,
        valor_multa=0,
        valor_juros=0,
        valor_total=total,
        vencimento=_vencimento_mes(ano, mes, aluno_plano.dia_vencimento),
        status="ABERTO",
        forma_pagamento_preferida="BOLETO",
    )

    db.session.add(cobranca)
    db.session.flush()
    audit_log("GENERATE_STUDENT_CHARGE", "cobrancas", cobranca.id, None, snapshot(cobranca))
    db.session.commit()

    return jsonify(model_to_dict(cobranca)), 201
