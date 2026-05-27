from flask import Blueprint, jsonify, request, g
from ..extensions import db
from ..models import GrupoUsuario, Permissao, GrupoPermissao
from ..utils.auth import permission_required
from ..utils.serializers import model_to_dict
from ..services.audit import audit_log, snapshot

grupos_bp = Blueprint("grupos", __name__)

@grupos_bp.get("/")
@permission_required("grupos.visualizar")
def list_grupos():
    grupos = GrupoUsuario.query.filter_by(empresa_id=g.current_user.empresa_id).order_by(GrupoUsuario.nome).all()
    result = []
    for grupo in grupos:
        item = model_to_dict(grupo)
        perms = (
            db.session.query(Permissao.codigo)
            .join(GrupoPermissao, GrupoPermissao.permissao_id == Permissao.id)
            .filter(GrupoPermissao.grupo_id == grupo.id)
            .all()
        )
        item["permissoes"] = [p[0] for p in perms]
        result.append(item)
    return jsonify(result)

@grupos_bp.get("/permissoes")
@permission_required("grupos.visualizar")
def list_permissoes():
    permissoes = Permissao.query.order_by(Permissao.modulo, Permissao.codigo).all()
    return jsonify([model_to_dict(p) for p in permissoes])

@grupos_bp.post("/")
@permission_required("grupos.criar")
def create_grupo():
    data = request.get_json() or {}
    grupo = GrupoUsuario(
        empresa_id=g.current_user.empresa_id,
        nome=data.get("nome"),
        descricao=data.get("descricao"),
        is_admin=bool(data.get("is_admin", False)),
        status=data.get("status", "ATIVO"),
    )
    db.session.add(grupo)
    db.session.flush()

    for codigo in data.get("permissoes", []):
        perm = Permissao.query.filter_by(codigo=codigo).first()
        if perm:
            db.session.add(GrupoPermissao(grupo_id=grupo.id, permissao_id=perm.id))

    audit_log("CREATE", "grupos_usuarios", grupo.id, None, snapshot(grupo))
    db.session.commit()
    return jsonify(model_to_dict(grupo)), 201

@grupos_bp.put("/<uuid:grupo_id>/permissoes")
@permission_required("grupos.editar_permissoes")
def update_permissoes(grupo_id):
    grupo = GrupoUsuario.query.filter_by(id=grupo_id, empresa_id=g.current_user.empresa_id).first_or_404()
    old_perms = [
        row[0] for row in db.session.query(Permissao.codigo)
        .join(GrupoPermissao, GrupoPermissao.permissao_id == Permissao.id)
        .filter(GrupoPermissao.grupo_id == grupo.id)
        .all()
    ]

    data = request.get_json() or {}
    new_codes = set(data.get("permissoes", []))

    GrupoPermissao.query.filter_by(grupo_id=grupo.id).delete()

    for codigo in new_codes:
        perm = Permissao.query.filter_by(codigo=codigo).first()
        if perm:
            db.session.add(GrupoPermissao(grupo_id=grupo.id, permissao_id=perm.id))

    audit_log(
        "UPDATE_PERMISSIONS",
        "grupos_usuarios",
        grupo.id,
        {"permissoes": old_perms},
        {"permissoes": sorted(new_codes)}
    )
    db.session.commit()
    return jsonify({"message": "Permissões atualizadas"})
