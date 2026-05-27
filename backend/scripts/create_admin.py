import os
import sys
from getpass import getpass

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models import Empresa, GrupoUsuario, Usuario
from app.utils.passwords import hash_password

app = create_app()

with app.app_context():
    empresa_id = input("Empresa ID: ").strip()
    grupo_id = input("Grupo admin ID: ").strip()
    nome = input("Nome: ").strip()
    email = input("Email: ").strip().lower()
    senha = getpass("Senha: ")

    empresa = db.session.get(Empresa, empresa_id)
    grupo = db.session.get(GrupoUsuario, grupo_id)

    if not empresa:
        raise SystemExit("Empresa não encontrada")
    if not grupo:
        raise SystemExit("Grupo não encontrado")

    user = Usuario(
        empresa_id=empresa.id,
        grupo_id=grupo.id,
        nome=nome,
        email=email,
        senha_hash=hash_password(senha),
        status="ATIVO",
    )

    db.session.add(user)
    db.session.commit()
    print(f"Usuário criado: {user.id}")
