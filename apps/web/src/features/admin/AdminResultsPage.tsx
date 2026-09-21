import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { type AdminAssessmentResult, listAdminAssessmentResults } from '../../api/admin-results';
import { ApiError } from '../../api/http';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; results: AdminAssessmentResult[] }
  | { kind: 'error'; message: string };

const statusLabel: Record<AdminAssessmentResult['status'], string> = {
  ACTIVE: 'En curso',
  COMPLETED: 'Finalizado',
  EXPIRED: 'Expirado',
};

export function AdminResultsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    listAdminAssessmentResults(controller.signal)
      .then((results) => setState({ kind: 'ready', results }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          kind: 'error',
          message: error instanceof ApiError ? error.message : 'No fue posible cargar los resultados.',
        });
      });
    return () => controller.abort();
  }, []);

  const results = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return state.results;

    return state.results.filter((result) =>
      `${result.candidate.displayName} ${result.candidate.email} ${result.assessment.name}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, state]);

  return (
    <section className="admin-results-page" aria-labelledby="admin-results-title">
      <header className="admin-heading">
        <div>
          <h1 id="admin-results-title">Resultados de candidatos</h1>
          <p>Consulta el avance, el puntaje y el tiempo utilizado en cada reto realizado.</p>
        </div>
      </header>

      {state.kind === 'loading' && <div className="admin-results-loading"><span className="skeleton skeleton-results-body" /></div>}
      {state.kind === 'error' && <div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h2>Los resultados no están disponibles</h2><p>{state.message}</p></div></div>}

      {state.kind === 'ready' && (
        <>
          <div className="admin-results-toolbar">
            <label htmlFor="admin-results-search">Buscar resultados
              <input
                id="admin-results-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Candidato, correo o reto"
                type="search"
                value={query}
              />
            </label>
            <span>{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</span>
          </div>

          {results.length === 0 ? (
            <div className="status-panel empty-panel">
              <span className="status-symbol" aria-hidden="true">—</span>
              <div>
                <h2>{query.trim() ? 'No encontramos resultados' : 'No hay resultados para mostrar'}</h2>
                <p>{query.trim() ? 'Prueba con otro nombre, correo o título de reto.' : 'Los intentos de los candidatos aparecerán aquí cuando inicien un reto.'}</p>
              </div>
            </div>
          ) : (
            <div className="admin-results-table" role="region" aria-label="Resultados de candidatos" tabIndex={0}>
              <table>
                <thead>
                  <tr><th>Candidato</th><th>Reto</th><th>Estado</th><th>Puntaje</th><th>Ejercicios</th><th>Tiempo</th><th>Finalización</th><th><span className="sr-only">Detalle</span></th></tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td data-label="Candidato"><strong>{result.candidate.displayName}</strong><small>{result.candidate.email}</small></td>
                      <td data-label="Reto">{result.assessment.name}</td>
                      <td data-label="Estado"><span className={`admin-result-status ${result.status.toLowerCase()}`}>{statusLabel[result.status]}</span></td>
                      <td data-label="Puntaje"><strong>{result.score === null ? '—' : `${result.score}%`}</strong></td>
                      <td data-label="Ejercicios">{result.completedQuestions} resueltos <small>{result.questionsCorrect} correctos · {result.questionsIncorrect} incorrectos</small></td>
                      <td data-label="Tiempo">{formatDuration(result.timeConsumedSeconds)}</td>
                      <td data-label="Finalización">{formatDate(result.completedAt ?? result.expiredAt ?? result.startedAt)}</td>
                      <td data-label="Detalle"><Link className="admin-result-link" to={`/admin/results/${result.id}`}>Ver detalle <span aria-hidden="true">→</span></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) return '—';
  return `${Math.floor(totalSeconds / 60)} min ${String(totalSeconds % 60).padStart(2, '0')} s`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
