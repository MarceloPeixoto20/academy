import secrets
from flask import request, jsonify, g
from ..utils.auth import load_current_user

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT_PATHS = {"/api/auth/login", "/api/auth/refresh", "/api/auth/logout"}


def register_security_middleware(app):
    @app.before_request
    def before_request():
        load_current_user()

        if request.path.startswith("/api/") and request.method not in SAFE_METHODS:
            if request.path in CSRF_EXEMPT_PATHS or request.path.startswith("/api/academy/public/"):
                return None

            cookie_token = request.cookies.get("csrf_token")
            header_token = request.headers.get("X-CSRF-Token")

            if not cookie_token or not header_token or cookie_token != header_token:
                return jsonify({"error": "CSRF token inválido"}), 403

    @app.after_request
    def after_request(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


def new_csrf_token():
    return secrets.token_urlsafe(32)
