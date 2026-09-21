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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div><strong>Control Comercial</strong><span>Ventas e inventario</span></div>
        </div>
        <nav className="side-nav" aria-label="Módulos principales">
          <NavLink to="/" end><span className="nav-icon">▦</span><span>Ventas</span></NavLink>
          <NavLink to="/inventario"><span className="nav-icon">◫</span><span>Inventario</span></NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card"><span className="user-avatar">{usuario?.email?.slice(0, 1).toUpperCase() ?? 'U'}</span><div><strong>{usuario?.email}</strong><span>{usuario?.rol}</span></div></div>
          <button className="logout-button" onClick={salir}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
