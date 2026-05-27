from datetime import date

from flask import Blueprint, jsonify, request, g
from sqlalchemy import or_

from ..extensions import db
from ..models import Aluno, AlunoTreino, Exercicio, Treinador, Treino, TreinoExercicio
from ..utils.auth import permission_required, apply_filial_scope, ensure_filial_allowed
from ..utils.serializers import model_to_dict, update_model_from_json
from ..services.audit import audit_log, snapshot

treinos_bp = Blueprint("treinos", __name__)

TREINO_FIELDS = ["filial_id", "treinador_id", "nome", "objetivo", "nivel", "status", "data_inicio", "data_fim", "observacoes"]
TREINO_EXERCICIO_FIELDS = ["exercicio_id", "grupo_treino", "dia_semana", "ordem", "series", "repeticoes", "carga", "descanso_segundos", "observacoes"]
ALUNO_TREINO_FIELDS = ["treino_id", "treinador_id", "dia_semana", "status", "data_inicio", "data_fim", "observacoes"]


def _to_int_or_none(value):
    if value in ("", None):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _get_treino_or_404(treino_id):
    return apply_filial_scope(Treino.query, Treino, g.current_user).filter(Treino.id == treino_id).first_or_404()


def _get_aluno_or_404(aluno_id):
    return apply_filial_scope(Aluno.query, Aluno, g.current_user).filter(Aluno.id == aluno_id).first_or_404()


def _validate_treinador(treinador_id):
    if not treinador_id:
        return None
    return Treinador.query.filter_by(id=treinador_id, empresa_id=g.current_user.empresa_id, status="ATIVO").first()


def _require_treinador(treinador_id):
    treinador = _validate_treinador(treinador_id)
    if not treinador:
        return None, (jsonify({"error": "Escolha um treinador cadastrado e ativo"}), 400)
    return treinador, None


def _serialize_treino(treino, include_exercicios=True):
    item = model_to_dict(treino)
    treinador = _validate_treinador(treino.treinador_id) if treino.treinador_id else None
    item["treinador_nome"] = treinador.nome if treinador else None
    exercicios_query = TreinoExercicio.query.filter_by(treino_id=treino.id)

    if include_exercicios:
        exercicios = []
        for treino_exercicio in exercicios_query.order_by(TreinoExercicio.ordem).all():
            row = model_to_dict(treino_exercicio)
            exercicio = Exercicio.query.filter_by(id=treino_exercicio.exercicio_id, empresa_id=g.current_user.empresa_id).first()
            row["exercicio_nome"] = exercicio.nome if exercicio else None
            row["equipamento"] = exercicio.equipamento if exercicio else None
            exercicios.append(row)
        item["exercicios"] = exercicios
        item["qtd_exercicios"] = len(exercicios)
    else:
        item["qtd_exercicios"] = exercicios_query.count()

    return item


def _serialize_aluno_treino(aluno_treino):
    item = model_to_dict(aluno_treino)
    treino = Treino.query.filter_by(id=aluno_treino.treino_id, empresa_id=g.current_user.empresa_id).first()
    item["treino"] = _serialize_treino(treino, include_exercicios=True) if treino else None
    item["treino_nome"] = treino.nome if treino else None
    item["objetivo"] = treino.objetivo if treino else None
    item["nivel"] = treino.nivel if treino else None
    treinador = _validate_treinador(aluno_treino.treinador_id) if aluno_treino.treinador_id else None
    item["treinador_nome"] = treinador.nome if treinador else None
    return item


def _replace_treino_exercicios(treino, exercicios):
    TreinoExercicio.query.filter_by(treino_id=treino.id).delete()

    for index, exercicio_data in enumerate(exercicios or [], start=1):
        if not exercicio_data.get("exercicio_id"):
            continue

        exercicio = Exercicio.query.filter_by(id=exercicio_data.get("exercicio_id"), empresa_id=g.current_user.empresa_id).first()
        if not exercicio:
            continue

        treino_exercicio = TreinoExercicio(treino_id=treino.id, exercicio_id=exercicio.id)
        for field in TREINO_EXERCICIO_FIELDS:
            if field in exercicio_data:
                setattr(treino_exercicio, field, exercicio_data.get(field))

        treino_exercicio.ordem = _to_int_or_none(exercicio_data.get("ordem")) or index
        treino_exercicio.series = _to_int_or_none(exercicio_data.get("series"))
        treino_exercicio.descanso_segundos = _to_int_or_none(exercicio_data.get("descanso_segundos"))
        db.session.add(treino_exercicio)


@treinos_bp.get("/")
@permission_required("treinos.visualizar")
def list_treinos():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "").strip()
    query = apply_filial_scope(Treino.query, Treino, g.current_user)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Treino.nome.ilike(like), Treino.objetivo.ilike(like)))
    if status:
        query = query.filter(Treino.status == status)

    rows = query.order_by(Treino.created_at.desc()).limit(500).all()
    return jsonify([_serialize_treino(row, include_exercicios=False) for row in rows])


@treinos_bp.get("/<uuid:treino_id>")
@permission_required("treinos.visualizar")
def get_treino(treino_id):
    treino = _get_treino_or_404(treino_id)
    return jsonify(_serialize_treino(treino, include_exercicios=True))


@treinos_bp.post("/")
@permission_required("treinos.criar")
def create_treino():
    data = request.get_json() or {}

    if not data.get("filial_id"):
        return jsonify({"error": "filial_id é obrigatório"}), 400
    if not ensure_filial_allowed(g.current_user, data["filial_id"]):
        return jsonify({"error": "Usuário não tem acesso a essa filial"}), 403

    _, error = _require_treinador(data.get("treinador_id"))
    if error:
        return error

    treino = Treino(empresa_id=g.current_user.empresa_id)
    update_model_from_json(treino, data, TREINO_FIELDS)
    db.session.add(treino)
    db.session.flush()
    _replace_treino_exercicios(treino, data.get("exercicios", []))
    audit_log("CREATE", "treinos", treino.id, None, snapshot(treino))
    db.session.commit()
    return jsonify(_serialize_treino(treino, include_exercicios=True)), 201


@treinos_bp.put("/<uuid:treino_id>")
@permission_required("treinos.editar")
def update_treino(treino_id):
    treino = _get_treino_or_404(treino_id)
    old = snapshot(treino)
    data = request.get_json() or {}

    if "filial_id" in data and not ensure_filial_allowed(g.current_user, data["filial_id"]):
        return jsonify({"error": "Usuário não tem acesso a essa filial"}), 403

    final_treinador_id = data.get("treinador_id", treino.treinador_id)
    _, error = _require_treinador(final_treinador_id)
    if error:
        return error

    update_model_from_json(treino, data, TREINO_FIELDS)
    if "exercicios" in data:
        _replace_treino_exercicios(treino, data.get("exercicios", []))

    audit_log("UPDATE", "treinos", treino.id, old, snapshot(treino))
    db.session.commit()
    return jsonify(_serialize_treino(treino, include_exercicios=True))


@treinos_bp.delete("/<uuid:treino_id>")
@permission_required("treinos.excluir")
def delete_treino(treino_id):
    treino = _get_treino_or_404(treino_id)
    old = snapshot(treino)
    treino.status = "INATIVO"
    audit_log("SOFT_DELETE", "treinos", treino.id, old, snapshot(treino))
    db.session.commit()
    return jsonify({"message": "Treino inativado"})


@treinos_bp.get("/aluno/<uuid:aluno_id>")
@permission_required("treinos.visualizar")
def list_treinos_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    status = request.args.get("status", "").strip()
    query = AlunoTreino.query.filter_by(empresa_id=g.current_user.empresa_id, aluno_id=aluno.id)

    if status:
        query = query.filter(AlunoTreino.status == status)

    rows = query.order_by(AlunoTreino.created_at.desc()).all()
    return jsonify([_serialize_aluno_treino(row) for row in rows])


@treinos_bp.post("/aluno/<uuid:aluno_id>")
@permission_required("treinos.criar")
def alocar_treino_aluno(aluno_id):
    aluno = _get_aluno_or_404(aluno_id)
    data = request.get_json() or {}

    if not data.get("treino_id"):
        return jsonify({"error": "treino_id é obrigatório"}), 400
    if not data.get("dia_semana"):
        return jsonify({"error": "dia_semana é obrigatório"}), 400

    _, error = _require_treinador(data.get("treinador_id"))
    if error:
        return error

    treino = _get_treino_or_404(data["treino_id"])
    if str(treino.filial_id) != str(aluno.filial_id):
        return jsonify({"error": "O treino precisa pertencer à mesma filial do aluno"}), 400

    aluno_treino = AlunoTreino(
        empresa_id=g.current_user.empresa_id,
        filial_id=aluno.filial_id,
        aluno_id=aluno.id,
        status="ATIVO",
        data_inicio=data.get("data_inicio") or date.today(),
    )
    update_model_from_json(aluno_treino, data, ALUNO_TREINO_FIELDS)
    db.session.add(aluno_treino)
    db.session.flush()
    audit_log("ALLOCATE_STUDENT_WORKOUT", "aluno_treinos", aluno_treino.id, None, snapshot(aluno_treino))
    db.session.commit()
    return jsonify(_serialize_aluno_treino(aluno_treino)), 201


@treinos_bp.put("/aluno/<uuid:aluno_id>/<uuid:aluno_treino_id>")
@permission_required("treinos.editar")
def update_treino_aluno(aluno_id, aluno_treino_id):
    aluno = _get_aluno_or_404(aluno_id)
    aluno_treino = AlunoTreino.query.filter_by(id=aluno_treino_id, empresa_id=g.current_user.empresa_id, aluno_id=aluno.id).first_or_404()
    old = snapshot(aluno_treino)
    data = request.get_json() or {}

    if data.get("treino_id"):
        treino = _get_treino_or_404(data["treino_id"])
        if str(treino.filial_id) != str(aluno.filial_id):
            return jsonify({"error": "O treino precisa pertencer à mesma filial do aluno"}), 400

    final_treinador_id = data.get("treinador_id", aluno_treino.treinador_id)
    _, error = _require_treinador(final_treinador_id)
    if error:
        return error

    update_model_from_json(aluno_treino, data, ALUNO_TREINO_FIELDS)
    audit_log("UPDATE_STUDENT_WORKOUT", "aluno_treinos", aluno_treino.id, old, snapshot(aluno_treino))
    db.session.commit()
    return jsonify(_serialize_aluno_treino(aluno_treino))


@treinos_bp.delete("/aluno/<uuid:aluno_id>/<uuid:aluno_treino_id>")
@permission_required("treinos.editar")
def inativar_treino_aluno(aluno_id, aluno_treino_id):
    aluno = _get_aluno_or_404(aluno_id)
    aluno_treino = AlunoTreino.query.filter_by(id=aluno_treino_id, empresa_id=g.current_user.empresa_id, aluno_id=aluno.id).first_or_404()
    old = snapshot(aluno_treino)
    aluno_treino.status = "INATIVO"
    audit_log("INACTIVATE_STUDENT_WORKOUT", "aluno_treinos", aluno_treino.id, old, snapshot(aluno_treino))
    db.session.commit()
    return jsonify({"message": "Treino removido do aluno"})
