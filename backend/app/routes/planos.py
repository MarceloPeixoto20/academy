from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Plano
from ..utils.auth import permission_required
from ..utils.serializers import model_to_dict
from ..services.audit import audit_log, snapshot

planos_bp = Blueprint("planos", __name__)

FIELDS = [
    "nome", "descricao", "valor_mensal", "duracao_meses",
    "multa_atraso_ativa", "percentual_multa", "juros_dia", "status"
]

@planos_bp.get("/")
@permission_required("planos.visualizar")
def list_planos():
    planos = Plano.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(Plano.nome).all()
    return jsonify([model_to_dict(p) for p in planos])

@planos_bp.post("/")
@permission_required("planos.criar")
def create_plano():
    data = request.get_json() or {}
    plano = Plano(empresa_id=g.current_user.empresa_id)
    for field in FIELDS:
        if field in data:
            setattr(plano, field, data[field])

    db.session.add(plano)
    db.session.flush()
    audit_log("CREATE", "planos", plano.id, None, snapshot(plano))
    db.session.commit()
    return jsonify(model_to_dict(plano)), 201

@planos_bp.put("/<uuid:plano_id>")
@permission_required("planos.editar")
def update_plano(plano_id):
    plano = Plano.query.filter_by(id=plano_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old = snapshot(plano)

    data = request.get_json() or {}
    for field in FIELDS:
        if field in data:
            setattr(plano, field, data[field])

    audit_log("UPDATE", "planos", plano.id, old, snapshot(plano))
    db.session.commit()
    return jsonify(model_to_dict(plano))
