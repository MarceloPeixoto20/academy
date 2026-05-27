from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Treinador, TreinadorFilial
from ..utils.auth import permission_required, apply_empresa_scope
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

treinadores_bp = Blueprint("treinadores", __name__)

FIELDS = [
    "nome", "cpf", "telefone", "whatsapp", "email", "cep", "endereco",
    "numero", "complemento", "bairro", "cidade", "uf", "cref",
    "especialidade", "status", "observacoes"
]

@treinadores_bp.get("/")
@permission_required("treinadores.visualizar")
def list_treinadores():
    q = request.args.get("q", "").strip()

    query = apply_empresa_scope(Treinador.query, Treinador, g.current_user)

    if q:
        like = f"%{q}%"
        query = query.filter((Treinador.nome.ilike(like)) | (Treinador.cpf.ilike(like)))

    rows = query.order_by(Treinador.created_at.desc()).limit(500).all()

    result = []
    for row in rows:
        item = model_to_dict(row)
        item["filiais"] = [
            str(x.filial_id)
            for x in TreinadorFilial.query.filter_by(treinador_id=row.id).all()
        ]
        result.append(item)

    return jsonify(result)

@treinadores_bp.get("/<uuid:treinador_id>")
@permission_required("treinadores.visualizar")
def get_treinador(treinador_id):
    treinador = (
        apply_empresa_scope(Treinador.query, Treinador, g.current_user)
        .filter(Treinador.id == treinador_id)
        .first_or_404()
    )

    item = model_to_dict(treinador)
    item["filiais"] = [
        str(x.filial_id)
        for x in TreinadorFilial.query.filter_by(treinador_id=treinador.id).all()
    ]

    return jsonify(item)

@treinadores_bp.post("/")
@permission_required("treinadores.criar")
def create_treinador():
    data = request.get_json() or {}

    treinador = Treinador(empresa_id=g.current_user.empresa_id)
    update_model_from_json(treinador, data, FIELDS)

    db.session.add(treinador)
    db.session.flush()

    for filial_id in data.get("filiais", []):
        db.session.add(TreinadorFilial(treinador_id=treinador.id, filial_id=filial_id))

    audit_log("CREATE", "treinadores", treinador.id, None, snapshot(treinador))
    db.session.commit()

    return jsonify(model_to_dict(treinador)), 201

@treinadores_bp.put("/<uuid:treinador_id>")
@permission_required("treinadores.editar")
def update_treinador(treinador_id):
    treinador = (
        apply_empresa_scope(Treinador.query, Treinador, g.current_user)
        .filter(Treinador.id == treinador_id)
        .first_or_404()
    )

    old = snapshot(treinador)
    data = request.get_json() or {}

    update_model_from_json(treinador, data, FIELDS)

    if "filiais" in data:
        TreinadorFilial.query.filter_by(treinador_id=treinador.id).delete()
        for filial_id in data.get("filiais", []):
            db.session.add(TreinadorFilial(treinador_id=treinador.id, filial_id=filial_id))

    audit_log("UPDATE", "treinadores", treinador.id, old, snapshot(treinador))
    db.session.commit()

    return jsonify(model_to_dict(treinador))

@treinadores_bp.delete("/<uuid:treinador_id>")
@permission_required("treinadores.excluir")
def delete_treinador(treinador_id):
    treinador = (
        apply_empresa_scope(Treinador.query, Treinador, g.current_user)
        .filter(Treinador.id == treinador_id)
        .first_or_404()
    )

    old = snapshot(treinador)
    treinador.status = "INATIVO"

    audit_log("SOFT_DELETE", "treinadores", treinador.id, old, snapshot(treinador))
    db.session.commit()

    return jsonify({"message": "Treinador inativado"})
