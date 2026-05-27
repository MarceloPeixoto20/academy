from flask import Blueprint, jsonify, request, g
from ..models import AuditLog
from ..utils.auth import permission_required
from ..utils.serializers import model_to_dict

logs_bp = Blueprint("logs", __name__)

@logs_bp.get("/")
@permission_required("logs.visualizar")
def list_logs():
    entidade = request.args.get("entidade")
    query = AuditLog.query.filter_by(empresa_id=g.current_user.empresa_id)
    if entidade:
        query = query.filter(AuditLog.entidade == entidade)
    rows = query.order_by(AuditLog.created_at.desc()).limit(500).all()
    return jsonify([model_to_dict(x) for x in rows])
