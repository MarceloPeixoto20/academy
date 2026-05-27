from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from ..extensions import db
from ..models import Usuario, UsuarioFilial
from ..utils.passwords import verify_password
from ..utils.jwt import create_token, decode_token
from ..utils.auth import login_required, user_permission_codes
from ..middleware.security import new_csrf_token

auth_bp = Blueprint("auth", __name__)

def set_auth_cookies(response, user_id):
    access_token = create_token(str(user_id), "access")
    refresh_token = create_token(str(user_id), "refresh")
    csrf_token = new_csrf_token()

    cookie_kwargs = {
        "httponly": True,
        "secure": current_app.config["COOKIE_SECURE"],
        "samesite": current_app.config["COOKIE_SAMESITE"],
        "domain": current_app.config["COOKIE_DOMAIN"],
    }

    response.set_cookie("access_token", access_token, max_age=60 * current_app.config["JWT_ACCESS_MINUTES"], **cookie_kwargs)
    response.set_cookie("refresh_token", refresh_token, max_age=60 * 60 * 24 * current_app.config["JWT_REFRESH_DAYS"], **cookie_kwargs)

    response.set_cookie(
        "csrf_token",
        csrf_token,
        max_age=60 * 60 * 24 * current_app.config["JWT_REFRESH_DAYS"],
        httponly=False,
        secure=current_app.config["COOKIE_SECURE"],
        samesite=current_app.config["COOKIE_SAMESITE"],
        domain=current_app.config["COOKIE_DOMAIN"],
    )
    return csrf_token

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha") or data.get("password") or ""

    user = Usuario.query.filter(db.func.lower(Usuario.email) == email).first()

    if not user or not verify_password(senha, user.senha_hash) or user.status != "ATIVO":
        return jsonify({"error": "Email ou senha inválidos"}), 401

    user.ultimo_login_at = datetime.utcnow()
    db.session.commit()

    response = jsonify({"message": "Login realizado com sucesso"})
    csrf_token = set_auth_cookies(response, user.id)
    response.json["csrf_token"] = csrf_token
    return response

@auth_bp.post("/refresh")
def refresh():
    token = request.cookies.get("refresh_token")
    if not token:
        return jsonify({"error": "Refresh token ausente"}), 401

    try:
        payload = decode_token(token, "refresh")
        user = db.session.get(Usuario, payload["sub"])
        if not user or user.status != "ATIVO":
            return jsonify({"error": "Usuário inválido"}), 401

        response = jsonify({"message": "Token atualizado"})
        csrf_token = set_auth_cookies(response, user.id)
        response.json["csrf_token"] = csrf_token
        return response
    except Exception:
        return jsonify({"error": "Refresh token inválido"}), 401

@auth_bp.post("/logout")
def logout():
    response = jsonify({"message": "Logout realizado"})
    for cookie_name in ["access_token", "refresh_token", "csrf_token"]:
        response.delete_cookie(cookie_name, domain=current_app.config["COOKIE_DOMAIN"])
    return response

@auth_bp.get("/me")
@login_required
def me():
    from flask import g
    user = g.current_user
    filial_ids = [str(row.filial_id) for row in UsuarioFilial.query.filter_by(usuario_id=user.id).all()]
    return jsonify({
        "id": str(user.id),
        "nome": user.nome,
        "email": user.email,
        "empresa_id": str(user.empresa_id),
        "grupo_id": str(user.grupo_id) if user.grupo_id else None,
        "grupo": user.grupo.nome if user.grupo else None,
        "is_admin": bool(user.grupo.is_admin) if user.grupo else False,
        "filiais": filial_ids,
        "permissions": sorted(user_permission_codes(user)),
    })
