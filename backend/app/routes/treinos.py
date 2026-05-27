from flask import Blueprint, jsonify, g
from ..models import Treino
from ..utils.auth import permission_required, apply_filial_scope
from ..utils.serializers import model_to_dict

treinos_bp = Blueprint("treinos", __name__)

@treinos_bp.get("/")
@permission_required("treinos.visualizar")
def list_treinos():
    query = apply_filial_scope(Treino.query, Treino, g.current_user)
    rows = query.order_by(Treino.created_at.desc()).limit(200).all()
    return jsonify([model_to_dict(row) for row in rows])
