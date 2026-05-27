from flask import request, g
from ..extensions import db
from ..models import AuditLog
from ..utils.serializers import model_to_dict

def audit_log(acao, entidade, entidade_id=None, dados_antigos=None, dados_novos=None):
    user = getattr(g, "current_user", None)
    log = AuditLog(
        empresa_id=getattr(user, "empresa_id", None),
        usuario_id=getattr(user, "id", None),
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        dados_antigos=dados_antigos,
        dados_novos=dados_novos,
        ip=request.headers.get("X-Forwarded-For", request.remote_addr),
        user_agent=request.headers.get("User-Agent"),
    )
    db.session.add(log)

def snapshot(model):
    if not model:
        return None
    return model_to_dict(model)
