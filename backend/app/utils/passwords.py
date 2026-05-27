from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def normalize_password(password: str) -> str:
    return (password or "")[:72]

def hash_password(password: str) -> str:
    return pwd_context.hash(normalize_password(password))

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(normalize_password(password), password_hash)
