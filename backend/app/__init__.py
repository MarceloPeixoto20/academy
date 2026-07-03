from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .extensions import db
from .middleware.security import register_security_middleware


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-Token"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    register_security_middleware(app)

    from .routes.auth import auth_bp
    from .routes.dashboard import dashboard_bp
    from .routes.alunos import alunos_bp
    from .routes.medidas import medidas_bp
    from .routes.filiais import filiais_bp
    from .routes.planos import planos_bp
    from .routes.usuarios import usuarios_bp
    from .routes.grupos import grupos_bp
    from .routes.financeiro import financeiro_bp
    from .routes.treinos import treinos_bp
    from .routes.treinadores import treinadores_bp
    from .routes.exercicios import exercicios_bp
    from .routes.configuracoes import configuracoes_bp
    from .routes.logs import logs_bp
    from .routes.operacional import operacional_bp
    from .routes.academy_ext import academy_ext_bp
    from .routes.referrals import referrals_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(alunos_bp, url_prefix="/api/alunos")
    app.register_blueprint(medidas_bp, url_prefix="/api/alunos")
    app.register_blueprint(filiais_bp, url_prefix="/api/filiais")
    app.register_blueprint(planos_bp, url_prefix="/api/planos")
    app.register_blueprint(usuarios_bp, url_prefix="/api/usuarios")
    app.register_blueprint(grupos_bp, url_prefix="/api/grupos")
    app.register_blueprint(financeiro_bp, url_prefix="/api/financeiro")
    app.register_blueprint(treinos_bp, url_prefix="/api/treinos")
    app.register_blueprint(treinadores_bp, url_prefix="/api/treinadores")
    app.register_blueprint(exercicios_bp, url_prefix="/api/exercicios")
    app.register_blueprint(configuracoes_bp, url_prefix="/api/configuracoes")
    app.register_blueprint(logs_bp, url_prefix="/api/logs")
    app.register_blueprint(operacional_bp, url_prefix="/api/operacional")
    app.register_blueprint(academy_ext_bp, url_prefix="/api/academy")
    app.register_blueprint(referrals_bp, url_prefix="/api/academy/public/referrals")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Acesso negado"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Não encontrado"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Erro interno"}), 500

    return app
