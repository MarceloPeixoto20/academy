from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID


def to_json_value(value):
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    return value


def model_to_dict(model, exclude=None):
    exclude = set(exclude or [])
    result = {}
    for column in model.__table__.columns:
        if column.name in exclude:
            continue
        result[column.name] = to_json_value(getattr(model, column.name))
    return result


def update_model_from_json(model, data, fields):
    for field in fields:
        if field in data:
            setattr(model, field, data[field])
    return model
