import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useDemoRole, type DemoRole } from '../features/roles/RoleContext';

export function AppLayout() {
  const { role, setRole } = useDemoRole();
  const location = useLocation();

  useEffect(() => {
    const routeRole: DemoRole = location.pathname.startsWith('/admin') ? 'ADMIN' : 'CANDIDATE';
    if (role !== routeRole) setRole(routeRole);
  }, [location.pathname, role, setRole]);
  const navigation = role === 'ADMIN'
    ? [{ to: '/admin', label: 'Administración' }]
    : [{ to: '/assessments', label: 'Retos disponibles' }];

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Primary navigation">
        <Link to="/" className="brand" aria-label="Ir al inicio">
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

        <Link className="change-role-link" to="/">Cambiar perfil</Link>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <span className="eyebrow">Technical Assessment Platform</span>
          <Link className="topbar-link" to="/">Cambiar perfil</Link>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
