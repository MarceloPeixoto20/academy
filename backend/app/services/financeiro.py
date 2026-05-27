from datetime import date
from calendar import monthrange
from decimal import Decimal
from ..extensions import db
from ..models import Aluno, AlunoPlano, Cobranca

def competencia_inicio(ano: int, mes: int):
    return date(ano, mes, 1)

def vencimento_mes(ano: int, mes: int, dia: int):
    ultimo_dia = monthrange(ano, mes)[1]
    return date(ano, mes, min(int(dia or 10), ultimo_dia))

def calcula_total(valor_mensal, desconto_valor=0, desconto_percentual=0):
    valor = Decimal(str(valor_mensal or 0))
    desc_val = Decimal(str(desconto_valor or 0))
    desc_perc = Decimal(str(desconto_percentual or 0))
    desconto_percentual_valor = valor * desc_perc / Decimal("100")
    total_desconto = desc_val + desconto_percentual_valor
    total = max(Decimal("0"), valor - total_desconto)
    return valor, total_desconto, total

def gerar_cobrancas_mensais(user, ano: int, mes: int, filial_ids=None):
    comp = competencia_inicio(ano, mes)

    query = (
        db.session.query(AlunoPlano, Aluno)
        .join(Aluno, Aluno.id == AlunoPlano.aluno_id)
        .filter(Aluno.empresa_id == user.empresa_id)
        .filter(Aluno.status == "ATIVO")
        .filter(AlunoPlano.status == "ATIVO")
    )

    if filial_ids:
        query = query.filter(Aluno.filial_id.in_(filial_ids))

    criadas = 0
    ignoradas = 0

    for aluno_plano, aluno in query.all():
        existente = Cobranca.query.filter_by(
            aluno_id=aluno.id,
            aluno_plano_id=aluno_plano.id,
            competencia=comp,
        ).first()

        if existente:
            ignoradas += 1
            continue

        valor_original, desconto, total = calcula_total(
            aluno_plano.valor_mensal,
            aluno_plano.desconto_valor,
            aluno_plano.desconto_percentual,
        )

        cobranca = Cobranca(
            empresa_id=user.empresa_id,
            filial_id=aluno.filial_id,
            aluno_id=aluno.id,
            aluno_plano_id=aluno_plano.id,
            competencia=comp,
            valor_original=valor_original,
            valor_desconto=desconto,
            valor_multa=0,
            valor_juros=0,
            valor_total=total,
            vencimento=vencimento_mes(ano, mes, aluno_plano.dia_vencimento),
            status="ABERTO",
            forma_pagamento_preferida="BOLETO",
        )
        db.session.add(cobranca)
        criadas += 1

    return {"criadas": criadas, "ignoradas": ignoradas}
