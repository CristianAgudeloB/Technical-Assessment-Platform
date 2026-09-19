import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../api/http';
import { AssessmentSummary, listAssessments, publishAssessment } from '../../api/assessments';

const statusLabel: Record<AssessmentSummary['status'], string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

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

  const published = useMemo(
    () => state.kind === 'ready' ? state.assessments.filter(({ status }) => status === 'PUBLISHED').length : 0,
    [state],
  );

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
    <section className="admin-page" aria-labelledby="admin-title">
      <header className="admin-heading">
        <div>
          <p className="section-kicker">Administración</p>
          <h1 id="admin-title">Gestiona tus retos</h1>
          <p>Crea retos, configura sus ejercicios y publícalos cuando estén listos para los candidatos.</p>
        </div>
        <Link className="admin-primary-action" to="/admin/assessments/new">Crear reto <span aria-hidden="true">+</span></Link>
      </header>

      <div className="admin-stats" aria-label="Resumen de retos">
        <div><span>Configurados</span><strong>{state.kind === 'ready' ? state.assessments.length : '—'}</strong></div>
        <div><span>Publicados</span><strong>{state.kind === 'ready' ? published : '—'}</strong></div>
        <div><span>Flujo</span><strong>Borrador → publicar</strong></div>
      </div>

      {state.kind === 'error' && <div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h2>La administración no está disponible</h2><p>{state.message}</p></div></div>}
      {publishError && <p className="form-error" role="alert">{publishError}</p>}
      {state.kind === 'loading' && <div className="admin-list"><span className="skeleton skeleton-results-body" /></div>}
      {state.kind === 'ready' && (
        <section className="admin-list" aria-labelledby="configured-title">
          <div className="admin-list-heading"><div><p className="section-kicker">Catálogo</p><h2 id="configured-title">Retos configurados</h2></div><span>{state.assessments.length} en total</span></div>
          {state.assessments.map((assessment) => (
            <article className="admin-assessment-row" key={assessment.id}>
              <span className={`status-pill ${assessment.status.toLowerCase()}`}>{statusLabel[assessment.status]}</span>
              <div><h3>{assessment.name}</h3><p>{assessment.description}</p></div>
              <span className="admin-duration">{assessment.durationMinutes} min</span>
              {assessment.status === 'DRAFT' && <div className="admin-row-actions">
                <Link className="open-link" to={`/admin/assessments/${assessment.id}/questions/new`}>Agregar ejercicio <span aria-hidden="true">→</span></Link>
                <button className="publish-assessment" disabled={publishingId === assessment.id} onClick={() => publish(assessment.id)} type="button">{publishingId === assessment.id ? 'Publicando…' : 'Publicar'}</button>
              </div>}
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
