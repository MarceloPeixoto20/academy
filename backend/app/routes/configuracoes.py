from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import ConfiguracaoSistema
from ..utils.auth import permission_required
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

configuracoes_bp = Blueprint("configuracoes", __name__)
FIELDS = ["chave","valor","tipo","descricao"]

@configuracoes_bp.get("/")
@permission_required("configuracoes.visualizar")
def list_configuracoes():
    rows = ConfiguracaoSistema.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(ConfiguracaoSistema.chave).all()
    return jsonify([model_to_dict(x) for x in rows])

@configuracoes_bp.post("/")
@permission_required("configuracoes.editar")
def upsert_configuracao():
    data = request.get_json() or {}
    chave = data.get("chave")
    if not chave:
        return jsonify({"error": "chave é obrigatória"}), 400

    item = ConfiguracaoSistema.query.filter_by(empresa_id=g.current_user.empresa_id, chave=chave).first()
    old = snapshot(item)
    if not item:
        item = ConfiguracaoSistema(empresa_id=g.current_user.empresa_id)
        db.session.add(item)

    update_model_from_json(item, data, FIELDS)
    db.session.flush()
    audit_log("UPSERT", "configuracoes_sistema", item.id, old, snapshot(item))
    db.session.commit()
    return jsonify(model_to_dict(item))
