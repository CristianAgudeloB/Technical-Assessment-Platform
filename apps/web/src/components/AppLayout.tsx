import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../features/auth/AuthContext';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigation = isAdmin
    ? [
        { to: '/admin', label: 'Retos' },
        { to: '/admin/assignments', label: 'Asignaciones' },
        { to: '/admin/results', label: 'Resultados' },
      ]
    : [{ to: '/assessments', label: 'Retos disponibles' }];

  const endSession = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Navegación principal">
        <Link to={isAdmin ? '/admin' : '/assessments'} className="brand" aria-label="Ir al inicio">
          <span className="brand-mark" aria-hidden="true">TA</span>
          <span>
            <strong>Technical Assessment Platform</strong>
          </span>
        </Link>

        <nav className="main-nav">
          <p className="nav-label">Navegación</p>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

      </aside>

      <main className="main-panel">
        <header className="topbar">
          <span className="topbar-user">{user?.displayName}</span>
          <button className="topbar-link" type="button" onClick={endSession}>Cerrar sesión</button>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
