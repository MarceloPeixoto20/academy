from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request, g

from ..extensions import db
from ..models import Aluno, AlunoMedida
from ..utils.auth import permission_required, apply_filial_scope
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

medidas_bp = Blueprint("medidas", __name__)

FIELDS = [
    "data_avaliacao",
    "peso_kg",
    "altura_cm",
    "pescoco_cm",
    "ombro_cm",
    "torax_cm",
    "cintura_cm",
    "abdomen_cm",
    "quadril_cm",
    "braco_direito_cm",
    "braco_esquerdo_cm",
    "antebraco_direito_cm",
    "antebraco_esquerdo_cm",
    "coxa_direita_cm",
    "coxa_esquerda_cm",
    "panturrilha_direita_cm",
    "panturrilha_esquerda_cm",
    "percentual_gordura",
    "percentual_massa_magra",
    "massa_muscular_kg",
    "massa_gorda_kg",
    "imc",
    "pressao_arterial",
    "frequencia_cardiaca",
    "objetivo",
    "observacoes",
    "treinador_id",
]

NUMERIC_FIELDS = {
    "peso_kg",
    "altura_cm",
    "pescoco_cm",
    "ombro_cm",
    "torax_cm",
    "cintura_cm",
    "abdomen_cm",
    "quadril_cm",
    "braco_direito_cm",
    "braco_esquerdo_cm",
    "antebraco_direito_cm",
    "antebraco_esquerdo_cm",
    "coxa_direita_cm",
    "coxa_esquerda_cm",
    "panturrilha_direita_cm",
    "panturrilha_esquerda_cm",
    "percentual_gordura",
    "percentual_massa_magra",
    "massa_muscular_kg",
    "massa_gorda_kg",
    "imc",
}

# Campos NUMERIC(6,2) aceitam até 9999.99.
MAX_NUMERIC_6_2 = Decimal("9999.99")


def _to_decimal_or_none(value):
    if value is None or value == "":
        return None

    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None


def _normalize_medida_payload(data):
    normalized = {}

    for field in FIELDS:
        if field not in data:
            continue

        value = data.get(field)

        if field in NUMERIC_FIELDS:
            decimal_value = _to_decimal_or_none(value)

            if decimal_value is None:
                normalized[field] = None
                continue

            if abs(decimal_value) > MAX_NUMERIC_6_2:
                raise ValueError(f"O campo {field} está acima do limite permitido.")

            normalized[field] = decimal_value
        else:
            normalized[field] = value if value != "" else None

    if normalized.get("frequencia_cardiaca") in ("", None):
        normalized["frequencia_cardiaca"] = None

    return normalized


def _calcular_imc_se_possivel(peso_kg, altura_cm):
    peso = _to_decimal_or_none(peso_kg)
    altura = _to_decimal_or_none(altura_cm)

    if not peso or not altura:
        return None

    # Evita gerar IMC absurdo quando o usuário digita altura de teste como "1".
    # Altura deve estar em centímetros, exemplo: 170.
    if altura < Decimal("50") or altura > Decimal("250"):
        return None

    if peso <= 0 or peso > Decimal("500"):
        return None

    altura_m = altura / Decimal("100")
    imc = peso / (altura_m * altura_m)

    if imc > MAX_NUMERIC_6_2:
        return None

    return imc.quantize(Decimal("0.01"))


@medidas_bp.get("/<uuid:aluno_id>/medidas")
@permission_required("alunos.medidas.visualizar")
def list_medidas(aluno_id):
    aluno = (
        apply_filial_scope(Aluno.query, Aluno, g.current_user)
        .filter(Aluno.id == aluno_id)
        .first_or_404()
    )

    rows = (
        AlunoMedida.query
        .filter_by(aluno_id=aluno.id, empresa_id=g.current_user.empresa_id)
        .order_by(AlunoMedida.data_avaliacao.desc())
        .all()
    )

    return jsonify([model_to_dict(x) for x in rows])


@medidas_bp.post("/<uuid:aluno_id>/medidas")
@permission_required("alunos.medidas.criar")
def create_medida(aluno_id):
    aluno = (
        apply_filial_scope(Aluno.query, Aluno, g.current_user)
        .filter(Aluno.id == aluno_id)
        .first_or_404()
    )

    try:
        data = _normalize_medida_payload(request.get_json() or {})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    item = AlunoMedida(
        empresa_id=g.current_user.empresa_id,
        filial_id=aluno.filial_id,
        aluno_id=aluno.id,
        responsavel_usuario_id=g.current_user.id,
    )

    update_model_from_json(item, data, FIELDS)

    # Calcula automaticamente apenas quando altura/peso são plausíveis.
    if item.peso_kg and item.altura_cm and not item.imc:
        item.imc = _calcular_imc_se_possivel(item.peso_kg, item.altura_cm)

    db.session.add(item)
    db.session.flush()

    audit_log("CREATE", "aluno_medidas", item.id, None, snapshot(item))
    db.session.commit()

    return jsonify(model_to_dict(item)), 201


@medidas_bp.put("/medidas/<uuid:medida_id>")
@permission_required("alunos.medidas.editar")
def update_medida(medida_id):
    item = (
        AlunoMedida.query
        .filter_by(id=medida_id, empresa_id=g.current_user.empresa_id)
        .first_or_404()
    )

    apply_filial_scope(Aluno.query, Aluno, g.current_user).filter(Aluno.id == item.aluno_id).first_or_404()

    old = snapshot(item)

    try:
        data = _normalize_medida_payload(request.get_json() or {})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    update_model_from_json(item, data, FIELDS)

    if item.peso_kg and item.altura_cm and not item.imc:
        item.imc = _calcular_imc_se_possivel(item.peso_kg, item.altura_cm)

    audit_log("UPDATE", "aluno_medidas", item.id, old, snapshot(item))
    db.session.commit()

    return jsonify(model_to_dict(item))


@medidas_bp.delete("/medidas/<uuid:medida_id>")
@permission_required("alunos.medidas.excluir")
def delete_medida(medida_id):
    item = (
        AlunoMedida.query
        .filter_by(id=medida_id, empresa_id=g.current_user.empresa_id)
        .first_or_404()
    )

    apply_filial_scope(Aluno.query, Aluno, g.current_user).filter(Aluno.id == item.aluno_id).first_or_404()

    old = snapshot(item)
    db.session.delete(item)

    audit_log("DELETE", "aluno_medidas", item.id, old, None)
    db.session.commit()

    return jsonify({"message": "Medida excluída"})
