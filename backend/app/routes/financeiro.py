from datetime import datetime, date
from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Cobranca, Pagamento
from ..utils.auth import permission_required, apply_filial_scope, get_user_filial_ids
from ..utils.serializers import model_to_dict
from ..services.audit import audit_log, snapshot
from ..services.financeiro import gerar_cobrancas_mensais

financeiro_bp = Blueprint("financeiro", __name__)

@financeiro_bp.get("/cobrancas")
@permission_required("financeiro.visualizar")
def list_cobrancas():
    status = request.args.get("status")
    query = apply_filial_scope(Cobranca.query, Cobranca, g.current_user)
    if status:
        query = query.filter(Cobranca.status == status)
    rows = query.order_by(Cobranca.vencimento.desc()).limit(500).all()
    return jsonify([model_to_dict(row) for row in rows])

@financeiro_bp.post("/gerar-mensais")
@permission_required("financeiro.gerar_cobranca")
def gerar_mensais():
    data = request.get_json() or {}
    hoje = date.today()
    ano = int(data.get("ano") or hoje.year)
    mes = int(data.get("mes") or hoje.month)
    filial_ids = get_user_filial_ids(g.current_user)
    result = gerar_cobrancas_mensais(g.current_user, ano, mes, filial_ids)
    audit_log("GENERATE_MONTHLY_CHARGES", "cobrancas", None, None, {"ano": ano, "mes": mes, **result})
    db.session.commit()
    return jsonify(result)

@financeiro_bp.post("/cobrancas/<uuid:cobranca_id>/baixar")
@permission_required("financeiro.baixar_pagamento")
def baixar_cobranca(cobranca_id):
    cobranca = apply_filial_scope(Cobranca.query, Cobranca, g.current_user).filter(Cobranca.id == cobranca_id).first_or_404()
    old = snapshot(cobranca)
    data = request.get_json() or {}

    pagamento = Pagamento(
        cobranca_id=cobranca.id,
        usuario_id=g.current_user.id,
        valor_pago=data.get("valor_pago", cobranca.valor_total),
        forma_pagamento=data.get("forma_pagamento", "MANUAL"),
        gateway=data.get("gateway"),
        gateway_payment_id=data.get("gateway_payment_id"),
        observacoes=data.get("observacoes"),
    )

    cobranca.status = "RECEBIDO"
    cobranca.recebido_at = datetime.utcnow()
    db.session.add(pagamento)
    audit_log("PAYMENT_RECEIVED", "cobrancas", cobranca.id, old, snapshot(cobranca))
    db.session.commit()

    return jsonify({"cobranca": model_to_dict(cobranca), "pagamento": model_to_dict(pagamento)})

@financeiro_bp.post("/cobrancas/<uuid:cobranca_id>/cancelar")
@permission_required("financeiro.cancelar_cobranca")
def cancelar_cobranca(cobranca_id):
    cobranca = apply_filial_scope(Cobranca.query, Cobranca, g.current_user).filter(Cobranca.id == cobranca_id).first_or_404()
    old = snapshot(cobranca)
    cobranca.status = "CANCELADO"
    cobranca.cancelado_at = datetime.utcnow()
    audit_log("CANCEL_CHARGE", "cobrancas", cobranca.id, old, snapshot(cobranca))
    db.session.commit()
    return jsonify(model_to_dict(cobranca))
