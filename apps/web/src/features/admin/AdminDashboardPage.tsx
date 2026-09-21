import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../api/http';
import { AssessmentSummary, listAssessments, publishAssessment } from '../../api/assessments';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; assessments: AssessmentSummary[] }
  | { kind: 'error'; message: string };

export function AdminDashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listAssessments(controller.signal)
      .then((assessments) => setState({ kind: 'ready', assessments }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ kind: 'error', message: error instanceof ApiError ? error.message : 'No fue posible cargar los retos.' });
      });
    return () => controller.abort();
  }, []);

  const publish = async (assessmentId: string) => {
    setPublishingId(assessmentId);
    setPublishError(null);

    try {
      const publishedAssessment = await publishAssessment(assessmentId);
      setState((current) => current.kind === 'ready'
        ? {
            ...current,
            assessments: current.assessments.map((assessment) =>
              assessment.id === assessmentId ? publishedAssessment : assessment,
            ),
          }
        : current);
    } catch (error: unknown) {
      setPublishError(error instanceof ApiError ? error.message : 'No fue posible publicar el reto.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <section className="admin-page" aria-busy={state.kind === 'loading'} aria-labelledby="admin-title">
      <header className="admin-heading">
        <div>
          <h1 id="admin-title">Gestiona los retos</h1>
          <p>Crea, edita y publica retos para los candidatos.</p>
        </div>
        <Link className="admin-primary-action" to="/admin/assessments/new">Crear reto <span aria-hidden="true">+</span></Link>
      </header>

      {state.kind === 'error' && <div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h2>La administración no está disponible</h2><p>{state.message}</p></div></div>}
      {publishError && <p className="form-error" role="alert">{publishError}</p>}
      {state.kind === 'loading' && <div className="admin-list" role="status"><span className="sr-only">Cargando retos…</span><span className="skeleton skeleton-results-body" /></div>}
      {state.kind === 'ready' && (
        <section className="admin-list" aria-labelledby="assessment-list-title">
          <div className="admin-list-heading"><div><h2 id="assessment-list-title">Retos</h2></div><span>{state.assessments.length} en total</span></div>
          {state.assessments.length === 0 ? (
            <div className="status-panel empty-panel">
              <span className="status-symbol" aria-hidden="true">+</span>
              <div><h2>Aún no hay retos</h2><p>Crea el primer reto para comenzar a configurar ejercicios y casos de prueba.</p></div>
            </div>
          ) : null}
          {state.assessments.map((assessment) => (
            <article className="admin-assessment-row" key={assessment.id}>
              <div><h3>{assessment.name}</h3><p>{assessment.description}</p></div>
              <span className="admin-duration">{assessment.durationMinutes} min</span>
              <div className="admin-row-actions">
                <Link className="open-link" to={`/admin/assessments/${assessment.id}/edit`}>Editar</Link>
                {assessment.status === 'DRAFT' && <>
                  <button className="publish-assessment" aria-busy={publishingId === assessment.id} disabled={publishingId !== null} onClick={() => publish(assessment.id)} type="button">
                    {publishingId === assessment.id ? <><span className="button-spinner" aria-hidden="true" />Publicando…</> : 'Publicar'}
                  </button>
                </>}
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
