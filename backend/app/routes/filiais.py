from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Filial
from ..utils.auth import permission_required
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

filiais_bp = Blueprint("filiais", __name__)
FIELDS = ["nome","cnpj","telefone","email","cep","endereco","numero","complemento","bairro","cidade","uf","status"]

@filiais_bp.get("/")
@permission_required("filiais.visualizar")
def list_filiais():
    rows = Filial.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(Filial.nome).all()
    return jsonify([model_to_dict(x) for x in rows])

@filiais_bp.post("/")
@permission_required("filiais.criar")
def create_filial():
    data = request.get_json() or {}
    item = Filial(empresa_id=g.current_user.empresa_id)
    update_model_from_json(item, data, FIELDS)
    db.session.add(item)
    db.session.flush()
    audit_log("CREATE", "filiais", item.id, None, snapshot(item))
    db.session.commit()
    return jsonify(model_to_dict(item)), 201

@filiais_bp.put("/<uuid:item_id>")
@permission_required("filiais.editar")
def update_filial(item_id):
    item = Filial.query.filter_by(id=item_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old = snapshot(item)
    update_model_from_json(item, request.get_json() or {}, FIELDS)
    audit_log("UPDATE", "filiais", item.id, old, snapshot(item))
    db.session.commit()
    return jsonify(model_to_dict(item))
