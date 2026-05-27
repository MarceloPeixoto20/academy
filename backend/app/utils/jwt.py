from datetime import datetime, timedelta, timezone
import jwt
from flask import current_app

def create_token(user_id: str, token_type: str = "access"):
    now = datetime.now(timezone.utc)
    if token_type == "refresh":
        exp = now + timedelta(days=current_app.config["JWT_REFRESH_DAYS"])
    else:
        exp = now + timedelta(minutes=current_app.config["JWT_ACCESS_MINUTES"])

    payload = {
        "sub": user_id,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")

def decode_token(token: str, expected_type: str = "access"):
    payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Tipo de token inválido")
    return payload
