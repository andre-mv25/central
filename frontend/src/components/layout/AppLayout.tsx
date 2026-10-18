import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export function AppLayout() {
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const salir = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="app-header">
        <h1>Registro de Ventas</h1>
        <nav className="nav-tabs">
          <NavLink to="/" className={({ isActive }) => `nav-tab ${isActive ? 'activo' : ''}`}>
            Ventas
          </NavLink>
          <NavLink to="/entradas" className={({ isActive }) => `nav-tab ${isActive ? 'activo' : ''}`}>
            Entradas
          </NavLink>
          <NavLink to="/historial" className={({ isActive }) => `nav-tab ${isActive ? 'activo' : ''}`}>
            Historial
          </NavLink>
        </nav>
        <div className="usuario">
          <span>
            {usuario?.email} · {usuario?.rol}
          </span>
          <button className="secundario" onClick={salir}>
            Salir
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
