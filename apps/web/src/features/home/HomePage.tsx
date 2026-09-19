import { useNavigate } from 'react-router';
import { useDemoRole, type DemoRole } from '../roles/RoleContext';

const spaces: Array<{
  role: DemoRole;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
}> = [
  {
    role: 'CANDIDATE',
    eyebrow: 'Presentar un reto',
    title: 'Soy candidato',
    description: 'Consulta los retos disponibles, resuelve los ejercicios y revisa tus resultados.',
    action: 'Ver retos disponibles',
  },
  {
    role: 'ADMIN',
    eyebrow: 'Gestionar la plataforma',
    title: 'Soy administrador',
    description: 'Crea retos, configura preguntas y define los casos de prueba de cada uno.',
    action: 'Ir a administración',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { setRole } = useDemoRole();

  const chooseSpace = (role: DemoRole) => {
    setRole(role);
    navigate(role === 'ADMIN' ? '/admin' : '/assessments');
  };

  return (
    <main className="home-page">
      <header className="home-brand">
        <span className="home-brand-mark" aria-hidden="true">TA</span>
        <span>Technical Assessment Platform</span>
      </header>

      <section className="home-content" aria-labelledby="home-title">
        <p className="section-kicker">Plataforma de evaluación técnica</p>
        <h1 id="home-title">¿Cómo quieres ingresar?</h1>
        <p className="home-intro">Elige el espacio que corresponde a tu tarea.</p>

        <div className="space-options">
          {spaces.map((space, index) => (
            <button
              className="space-option"
              key={space.role}
              onClick={() => chooseSpace(space.role)}
              type="button"
            >
              <span className="space-number" aria-hidden="true">0{index + 1}</span>
              <span className="space-copy">
                <small>{space.eyebrow}</small>
                <strong>{space.title}</strong>
                <span>{space.description}</span>
              </span>
              <span className="space-action">{space.action} <b aria-hidden="true">→</b></span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
