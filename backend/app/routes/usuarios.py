from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Usuario, UsuarioFilial, GrupoUsuario, Filial
from ..utils.auth import permission_required
from ..utils.passwords import hash_password
from ..utils.serializers import model_to_dict
from ..services.audit import audit_log, snapshot

usuarios_bp = Blueprint("usuarios", __name__)


def _serialize_usuario(user):
    item = model_to_dict(user, exclude=["senha_hash"])
    item["grupo"] = user.grupo.nome if user.grupo else None
    item["filiais"] = [str(x.filial_id) for x in UsuarioFilial.query.filter_by(usuario_id=user.id).all()]
    return item


def _sync_filiais(user, filial_ids):
    UsuarioFilial.query.filter_by(usuario_id=user.id).delete()

    for filial_id in filial_ids or []:
        filial = Filial.query.filter_by(id=filial_id, empresa_id=g.current_user.empresa_id).first()
        if filial:
            db.session.add(UsuarioFilial(usuario_id=user.id, filial_id=filial.id))


@usuarios_bp.get("/")
@permission_required("usuarios.visualizar")
def list_usuarios():
    users = Usuario.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(Usuario.nome).all()
    return jsonify([_serialize_usuario(user) for user in users])


@usuarios_bp.get("/<uuid:usuario_id>")
@permission_required("usuarios.visualizar")
def get_usuario(usuario_id):
    user = Usuario.query.filter_by(id=usuario_id, empresa_id=g.current_user.empresa_id).first_or_404()
    return jsonify(_serialize_usuario(user))


@usuarios_bp.post("/")
@permission_required("usuarios.criar")
def create_usuario():
    data = request.get_json() or {}
    required = ["nome", "email", "senha", "grupo_id"]
    missing = [x for x in required if not data.get(x)]
    if missing:
        return jsonify({"error": f"Campos obrigatórios: {', '.join(missing)}"}), 400

    grupo = GrupoUsuario.query.filter_by(id=data["grupo_id"], empresa_id=g.current_user.empresa_id).first()
    if not grupo:
        return jsonify({"error": "Grupo inválido"}), 400

    user = Usuario(
        empresa_id=g.current_user.empresa_id,
        nome=data["nome"],
        email=data["email"].strip().lower(),
        senha_hash=hash_password(data["senha"]),
        grupo_id=data["grupo_id"],
        status=data.get("status", "ATIVO"),
    )

    db.session.add(user)
    db.session.flush()
    _sync_filiais(user, data.get("filiais", []))

    audit_log("CREATE", "usuarios", user.id, None, model_to_dict(user, exclude=["senha_hash"]))
    db.session.commit()

    return jsonify(_serialize_usuario(user)), 201


@usuarios_bp.put("/<uuid:usuario_id>")
@permission_required("usuarios.editar")
def update_usuario(usuario_id):
    user = Usuario.query.filter_by(id=usuario_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old = _serialize_usuario(user)
    data = request.get_json() or {}

    if data.get("grupo_id"):
        grupo = GrupoUsuario.query.filter_by(id=data["grupo_id"], empresa_id=g.current_user.empresa_id).first()
        if not grupo:
            return jsonify({"error": "Grupo inválido"}), 400
        user.grupo_id = grupo.id

    if "nome" in data:
        user.nome = data.get("nome")
    if "email" in data and data.get("email"):
        user.email = data.get("email").strip().lower()
    if "status" in data:
        user.status = data.get("status") or "ATIVO"
    if data.get("senha"):
        user.senha_hash = hash_password(data["senha"])

    if "filiais" in data:
        _sync_filiais(user, data.get("filiais", []))

    db.session.flush()
    audit_log("UPDATE", "usuarios", user.id, old, _serialize_usuario(user))
    db.session.commit()

    return jsonify(_serialize_usuario(user))


@usuarios_bp.delete("/<uuid:usuario_id>")
@permission_required("usuarios.excluir")
def delete_usuario(usuario_id):
    user = Usuario.query.filter_by(id=usuario_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old = _serialize_usuario(user)
    user.status = "INATIVO"

    audit_log("SOFT_DELETE", "usuarios", user.id, old, _serialize_usuario(user))
    db.session.commit()

    return jsonify({"message": "Usuário inativado"})
