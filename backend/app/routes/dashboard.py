from datetime import datetime
from flask import Blueprint, jsonify, g, request
from sqlalchemy import func
from ..extensions import db
from ..models import Aluno, AlunoPlano, Cobranca, Plano
from ..routes.operacional import Indicacao
from ..utils.auth import permission_required, apply_filial_scope, has_permission


dashboard_bp = Blueprint("dashboard", __name__)


def _date_arg(name):
    value = request.args.get(name)
    if not value:
        return None
    return datetime.strptime(value[:10], "%Y-%m-%d").date()


@dashboard_bp.get("/")
@permission_required("dashboard.visualizar")
def dashboard():
    user = g.current_user
    filial_id = request.args.get("filial_id")
    inicio = _date_arg("inicio")
    fim = _date_arg("fim")

    alunos_query = apply_filial_scope(Aluno.query, Aluno, user)
    if filial_id:
        alunos_query = alunos_query.filter(Aluno.filial_id == filial_id)
    if inicio:
        alunos_query = alunos_query.filter(Aluno.data_cadastro >= inicio)
    if fim:
        alunos_query = alunos_query.filter(Aluno.data_cadastro <= fim)

    total_alunos = alunos_query.count()
    ativos = alunos_query.filter(Aluno.status == "ATIVO").count()
    inativos = alunos_query.filter(Aluno.status.in_(["INATIVO", "CANCELADO", "BLOQUEADO"])).count()

    cobrancas_query = apply_filial_scope(Cobranca.query, Cobranca, user)
    if filial_id:
        cobrancas_query = cobrancas_query.filter(Cobranca.filial_id == filial_id)
    if inicio:
        cobrancas_query = cobrancas_query.filter(Cobranca.vencimento >= inicio)
    if fim:
        cobrancas_query = cobrancas_query.filter(Cobranca.vencimento <= fim)

    abertas = cobrancas_query.filter(Cobranca.status == "ABERTO").count()
    atrasadas = cobrancas_query.filter(Cobranca.status == "ATRASADO").count()
    valor_em_aberto = cobrancas_query.filter(Cobranca.status.in_(["ABERTO", "ATRASADO"])).with_entities(func.coalesce(func.sum(Cobranca.valor_total), 0)).scalar()

    planos_ativos_query = db.session.query(AlunoPlano, Aluno).join(Aluno, Aluno.id == AlunoPlano.aluno_id).filter(Aluno.empresa_id == user.empresa_id, Aluno.status == "ATIVO", AlunoPlano.status == "ATIVO")
    if filial_id:
        planos_ativos_query = planos_ativos_query.filter(Aluno.filial_id == filial_id)
    ativos_com_plano = planos_ativos_query.count()

    genero_rows = alunos_query.with_entities(Aluno.sexo, func.count(Aluno.id)).group_by(Aluno.sexo).all()
    genero_total = sum(row[1] for row in genero_rows) or 1
    genero = [{"sexo": row[0] or "NÃO INFORMADO", "quantidade": row[1], "percentual": round(row[1] * 100 / genero_total, 2)} for row in genero_rows]

    top_planos_rows = db.session.query(Plano.nome, func.count(AlunoPlano.id)).join(AlunoPlano, AlunoPlano.plano_id == Plano.id).join(Aluno, Aluno.id == AlunoPlano.aluno_id).filter(Aluno.empresa_id == user.empresa_id)
    if filial_id:
        top_planos_rows = top_planos_rows.filter(Aluno.filial_id == filial_id)
    top_planos_rows = top_planos_rows.group_by(Plano.nome).order_by(func.count(AlunoPlano.id).desc()).limit(5).all()
    top_planos = [{"nome": row[0], "quantidade": row[1]} for row in top_planos_rows]

    indicacoes_query = Indicacao.query.filter_by(empresa_id=user.empresa_id)
    if filial_id:
        indicacoes_query = indicacoes_query.filter(Indicacao.filial_id == filial_id)
    if inicio:
        indicacoes_query = indicacoes_query.filter(Indicacao.created_at >= inicio)
    if fim:
        indicacoes_query = indicacoes_query.filter(Indicacao.created_at <= fim)
    indicacoes_total = indicacoes_query.count()
    indicacoes_por_status = dict(indicacoes_query.with_entities(Indicacao.status, func.count(Indicacao.id)).group_by(Indicacao.status).all())

    cards = {
        "total_alunos": total_alunos,
        "alunos_cadastrados_periodo": total_alunos,
        "alunos_ativos_com_plano": ativos_com_plano,
        "genero": genero,
        "top_planos": top_planos,
        "indicacoes_total": indicacoes_total,
        "indicacoes_por_status": indicacoes_por_status,
        "valor_em_aberto": float(valor_em_aberto or 0),
    }

    if has_permission(user, "dashboard.card_alunos_ativos"):
        cards["alunos_ativos"] = ativos
    if has_permission(user, "dashboard.card_alunos_inativos"):
        cards["alunos_inativos"] = inativos
    if has_permission(user, "dashboard.card_financeiro"):
        cards["cobrancas_abertas"] = abertas
        cards["cobrancas_atrasadas"] = atrasadas

    return jsonify(cards)
