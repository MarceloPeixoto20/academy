from functools import wraps
from flask import request, jsonify, g
from sqlalchemy import select
from ..extensions import db
from ..models import Usuario, UsuarioFilial, Permissao, GrupoPermissao
from .jwt import decode_token

def load_current_user():
    token = request.cookies.get("access_token")
    if not token:
        g.current_user = None
        return None

    try:
        payload = decode_token(token, "access")
        user = db.session.get(Usuario, payload["sub"])
        if not user or user.status != "ATIVO":
            g.current_user = None
            return None
        g.current_user = user
        return user
    except Exception:
        g.current_user = None
        return None

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = getattr(g, "current_user", None) or load_current_user()
        if not user:
            return jsonify({"error": "Não autenticado"}), 401
        return fn(*args, **kwargs)
    return wrapper

def user_permission_codes(user):
    if user.grupo and user.grupo.is_admin:
        rows = db.session.execute(select(Permissao.codigo)).all()
        return {row[0] for row in rows}

    rows = (
        db.session.query(Permissao.codigo)
        .join(GrupoPermissao, GrupoPermissao.permissao_id == Permissao.id)
        .filter(GrupoPermissao.grupo_id == user.grupo_id)
        .all()
    )
    return {row[0] for row in rows}

def has_permission(user, code: str) -> bool:
    if user.grupo and user.grupo.is_admin:
        return True
    return code in user_permission_codes(user)

def permission_required(code: str):
    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapper(*args, **kwargs):
            user = g.current_user
            if not has_permission(user, code):
                return jsonify({"error": "Sem permissão", "required": code}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_user_filial_ids(user):
    rows = (
        db.session.query(UsuarioFilial.filial_id)
        .filter(UsuarioFilial.usuario_id == user.id)
        .all()
    )
    return [row[0] for row in rows]

def apply_filial_scope(query, model, user):
    query = query.filter(model.empresa_id == user.empresa_id)
    filial_ids = get_user_filial_ids(user)
    if filial_ids and hasattr(model, "filial_id"):
        query = query.filter(model.filial_id.in_(filial_ids))
    return query


def apply_empresa_scope(query, model, user):
    if hasattr(model, "empresa_id"):
        return query.filter(model.empresa_id == user.empresa_id)
    return query

def ensure_filial_allowed(user, filial_id):
    filial_ids = get_user_filial_ids(user)
    return not filial_ids or str(filial_id) in {str(x) for x in filial_ids}
