from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import Usuario, UsuarioFilial, GrupoUsuario, Filial
from ..utils.auth import permission_required
from ..utils.passwords import hash_password
from ..utils.serializers import model_to_dict
from ..services.audit import audit_log, snapshot

usuarios_bp = Blueprint("usuarios", __name__)

@usuarios_bp.get("/")
@permission_required("usuarios.visualizar")
def list_usuarios():
    users = Usuario.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(Usuario.nome).all()
    result = []
    for user in users:
        item = model_to_dict(user, exclude=["senha_hash"])
        item["grupo"] = user.grupo.nome if user.grupo else None
        item["filiais"] = [str(x.filial_id) for x in UsuarioFilial.query.filter_by(usuario_id=user.id).all()]
        result.append(item)
    return jsonify(result)

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

    for filial_id in data.get("filiais", []):
        filial = Filial.query.filter_by(id=filial_id, empresa_id=g.current_user.empresa_id).first()
        if filial:
            db.session.add(UsuarioFilial(usuario_id=user.id, filial_id=filial.id))

    audit_log("CREATE", "usuarios", user.id, None, model_to_dict(user, exclude=["senha_hash"]))
    db.session.commit()

    return jsonify(model_to_dict(user, exclude=["senha_hash"])), 201
