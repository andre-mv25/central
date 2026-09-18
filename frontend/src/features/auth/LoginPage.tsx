import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(usuario, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={enviar}>
        <h1>Registro de Ventas</h1>
        <p>Ingresa con tu cuenta</p>

        <label>
          Usuario
          <input
            type="text"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            autoComplete="username"
            placeholder="usuario"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="contraseña"
            required
          />
        </label>

        <button type="submit" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        {error && <div className="error-msg">{error}</div>}
      </form>
    </div>
  );
}
