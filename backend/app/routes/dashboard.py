from datetime import date
from flask import Blueprint, jsonify, g, request
from sqlalchemy import func
from ..extensions import db
from ..models import Aluno, Cobranca
from ..utils.auth import permission_required, apply_filial_scope, has_permission

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.get("/")
@permission_required("dashboard.visualizar")
def dashboard():
    user = g.current_user

    alunos_query = apply_filial_scope(Aluno.query, Aluno, user)

    total_alunos = alunos_query.count()
    ativos = alunos_query.filter(Aluno.status == "ATIVO").count()
    inativos = alunos_query.filter(Aluno.status.in_(["INATIVO", "CANCELADO", "BLOQUEADO"])).count()

    cobrancas_query = apply_filial_scope(Cobranca.query, Cobranca, user)
    abertas = cobrancas_query.filter(Cobranca.status == "ABERTO").count()
    atrasadas = cobrancas_query.filter(Cobranca.status == "ATRASADO").count()

    cards = {
        "total_alunos": total_alunos,
    }

    if has_permission(user, "dashboard.card_alunos_ativos"):
        cards["alunos_ativos"] = ativos

    if has_permission(user, "dashboard.card_alunos_inativos"):
        cards["alunos_inativos"] = inativos

    if has_permission(user, "dashboard.card_financeiro"):
        cards["cobrancas_abertas"] = abertas
        cards["cobrancas_atrasadas"] = atrasadas

    return jsonify(cards)
