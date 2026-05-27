from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Exercicio
from ..utils.auth import permission_required
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

exercicios_bp = Blueprint("exercicios", __name__)
FIELDS = ["grupo_muscular_id","nome","descricao","equipamento","video_url","status"]

@exercicios_bp.get("/")
@permission_required("exercicios.visualizar")
def list_exercicios():
    q = request.args.get("q", "").strip()
    query = Exercicio.query.filter_by(empresa_id=g.current_user.empresa_id)
    if q:
        query = query.filter(Exercicio.nome.ilike(f"%{q}%"))
    rows = query.order_by(Exercicio.nome).limit(500).all()
    return jsonify([model_to_dict(x) for x in rows])

@exercicios_bp.post("/")
@permission_required("exercicios.criar")
def create_exercicio():
    data = request.get_json() or {}
    item = Exercicio(empresa_id=g.current_user.empresa_id)
    update_model_from_json(item, data, FIELDS)
    db.session.add(item)
    db.session.flush()
    audit_log("CREATE", "exercicios", item.id, None, snapshot(item))
    db.session.commit()
    return jsonify(model_to_dict(item)), 201

@exercicios_bp.put("/<uuid:item_id>")
@permission_required("exercicios.editar")
def update_exercicio(item_id):
    item = Exercicio.query.filter_by(id=item_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old = snapshot(item)
    update_model_from_json(item, request.get_json() or {}, FIELDS)
    audit_log("UPDATE", "exercicios", item.id, old, snapshot(item))
    db.session.commit()
    return jsonify(model_to_dict(item))
