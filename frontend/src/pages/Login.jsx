import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import flowGymLogo from "../assets/flowgym-logo.svg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, senha);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page flowgym-login">
      <form className="login-card" onSubmit={handleSubmit}>
        <img className="login-logo" src={flowGymLogo} alt="FlowGym" />
        <h1>FlowGym</h1>
        <p>Acesse o painel administrativo da academia</p>

        {error && <div className="alert">{error}</div>}

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

        <label>Senha</label>
        <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" />

        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
