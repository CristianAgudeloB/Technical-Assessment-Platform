import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ApiError } from '../../api/http';
import { useAuth } from './AuthContext';

type Mode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const { status, user, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/assessments'} replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const authenticatedUser = mode === 'login'
        ? await login(email, password)
        : await register(displayName, email, password);
      navigate(authenticatedUser.role === 'ADMIN' ? '/admin' : '/assessments', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No fue posible completar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-introduction" aria-labelledby="auth-title">
        <a className="auth-brand" href="/" aria-label="Technical Assessment Platform">
          <span aria-hidden="true">TA</span>
          <strong>Technical Assessment Platform</strong>
        </a>
        <div className="auth-introduction-copy">
          <h1 id="auth-title">Resuelve y avanza.</h1>
        </div>
      </section>

      <section className="auth-form-area" aria-label="Acceso a la plataforma">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
          <p className="auth-card-intro">
            {mode === 'login'
              ? 'Ingresa para continuar con tus retos o con la administración.'
              : 'Las cuentas creadas aquí son de candidato.'}
          </p>

          <div className="auth-mode-tabs" role="tablist" aria-label="Tipo de acceso">
            <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
              Iniciar sesión
            </button>
            <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
              Registrarme
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && (
              <label>
                Nombre completo
                <input
                  autoComplete="name"
                  maxLength={160}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  value={displayName}
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Contraseña
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              {mode === 'register' && <small>Usa al menos 8 caracteres.</small>}
            </label>
            {error && <p className="auth-form-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
