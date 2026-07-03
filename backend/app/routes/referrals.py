from datetime import date
from flask import Blueprint, jsonify, request, g
from sqlalchemy import text

from ..extensions import db
from ..routes.academy_ext import IndicacaoCampanha
from ..utils.auth import permission_required

referrals_bp = Blueprint("referrals", __name__)


@referrals_bp.get("/indicacoes")
@permission_required("operacional.visualizar")
def list_indicacoes_ext():
    rows = db.session.execute(text("""
        SELECT
            i.id::text,
            i.indicado_nome,
            i.indicado_contato,
            i.indicado_email,
            i.indicador_tipo,
            COALESCE(a.nome, c.nome) AS indicador_nome,
            i.status,
            i.recompensa_tipo,
            i.recompensa_valor,
            COALESCE(i.origem, 'MANUAL') AS origem,
            ic.nome AS campanha_nome,
            i.created_at
        FROM indicacoes i
        LEFT JOIN alunos a ON a.id = i.aluno_indicador_id
        LEFT JOIN colaboradores c ON c.id = i.colaborador_indicador_id
        LEFT JOIN indicacao_campanhas ic ON ic.id = i.campanha_id
        WHERE i.empresa_id = :empresa_id
        ORDER BY i.created_at DESC
        LIMIT 1000
    """), {"empresa_id": str(g.current_user.empresa_id)}).mappings().all()
    return jsonify([dict(row) for row in rows])


@referrals_bp.post("/public/indicacoes/<uuid:campanha_id>/<path:token>")
def public_indicacao_ext(campanha_id, token):
    campanha = IndicacaoCampanha.query.filter_by(id=campanha_id, status="ATIVA").first_or_404()
    hoje = date.today()
    if campanha.inicio and campanha.inicio > hoje:
        return jsonify({"error": "Campanha ainda não iniciou"}), 400
    if not campanha.sem_fim and campanha.fim and campanha.fim < hoje:
        return jsonify({"error": "Campanha encerrada"}), 400

    data = request.get_json() or {}
    parts = token.split(":")
    indicador_tipo, indicador_id = (parts[0], parts[1]) if len(parts) >= 2 else ("ALUNO", None)
    recompensa_tipo = campanha.recompensa_aluno_tipo if indicador_tipo == "ALUNO" else campanha.recompensa_colaborador_tipo
    recompensa_valor = campanha.recompensa_aluno_valor if indicador_tipo == "ALUNO" else campanha.recompensa_colaborador_valor

    db.session.execute(text("""
        INSERT INTO indicacoes (
            empresa_id, filial_id, campanha_id, token_indicador, origem,
            indicador_tipo, aluno_indicador_id, colaborador_indicador_id,
            indicado_nome, indicado_contato, indicado_email,
            status, recompensa_tipo, recompensa_valor, observacoes
        ) VALUES (
            :empresa_id, :filial_id, :campanha_id, :token_indicador, 'LINK',
            :indicador_tipo, :aluno_indicador_id, :colaborador_indicador_id,
            :indicado_nome, :indicado_contato, :indicado_email,
            'PENDENTE', :recompensa_tipo, :recompensa_valor, :observacoes
        )
    """), {
        "empresa_id": str(campanha.empresa_id),
        "filial_id": str(campanha.filial_id) if campanha.filial_id else None,
        "campanha_id": str(campanha.id),
        "token_indicador": token,
        "indicador_tipo": indicador_tipo,
        "aluno_indicador_id": indicador_id if indicador_tipo == "ALUNO" else None,
        "colaborador_indicador_id": indicador_id if indicador_tipo == "COLABORADOR" else None,
        "indicado_nome": data.get("nome"),
        "indicado_contato": data.get("telefone"),
        "indicado_email": data.get("email"),
        "recompensa_tipo": recompensa_tipo,
        "recompensa_valor": recompensa_valor,
        "observacoes": data.get("observacoes"),
    })
    db.session.commit()
    return jsonify({"message": "Indicação enviada com sucesso"}), 201
