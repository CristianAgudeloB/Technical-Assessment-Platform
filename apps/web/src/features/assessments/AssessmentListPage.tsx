import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AssessmentSummary, listAssessments } from '../../api/assessments';
import { ApiError } from '../../api/http';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'success'; assessments: AssessmentSummary[] }
  | { kind: 'error'; message: string };

function formatAvailability(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AssessmentListPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    listAssessments(controller.signal)
      .then((assessments) => setState({ kind: 'success', assessments }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;

        const message =
          error instanceof ApiError
            ? error.message
            : 'No fue posible conectar con la API. Confirma que el backend está en ejecución.';
        setState({ kind: 'error', message });
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="assessment-page" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <h1 id="page-title">Mis retos</h1>
          <p className="page-intro">
            Elige un reto para revisar sus instrucciones, resolver sus ejercicios y consultar tu progreso.
          </p>
        </div>
        <div className="list-summary" aria-live="polite">
          <span className="summary-number">
            {state.kind === 'success' ? state.assessments.length : '—'}
          </span>
          <span>asignados</span>
        </div>
      </div>

      {state.kind === 'loading' && <AssessmentListSkeleton />}

      {state.kind === 'error' && (
        <div className="status-panel error-panel" role="alert">
          <span className="status-symbol" aria-hidden="true">!</span>
          <div>
            <h2>Los retos no están disponibles</h2>
            <p>{state.message}</p>
          </div>
        </div>
      )}

      {state.kind === 'success' && state.assessments.length === 0 && (
        <div className="status-panel empty-panel">
          <span className="status-symbol" aria-hidden="true">+</span>
          <div>
            <h2>Aún no tienes retos asignados</h2>
            <p>Cuando un administrador te asigne un reto, aparecerá aquí.</p>
          </div>
        </div>
      )}

      {state.kind === 'success' && state.assessments.length > 0 && (
        <div className="assessment-list">
          {state.assessments.map((assessment) => (
            <article className="assessment-row" key={assessment.id}>
              <div className="assessment-index" aria-hidden="true">
                {String(assessment.durationMinutes).padStart(2, '0')}
                <span>min</span>
              </div>
              <div className="assessment-copy">
                <h2>{assessment.name}</h2>
                <p>{assessment.description}</p>
                {assessment.availableFrom && assessment.availableUntil && (
                  <p className="assessment-availability">
                    Disponible del {formatAvailability(assessment.availableFrom)} al {formatAvailability(assessment.availableUntil)}
                  </p>
                )}
              </div>
              <Link className="open-link" to={`/assessments/${assessment.id}`}>
                Ver reto <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AssessmentListSkeleton() {
  return (
    <div className="assessment-list" aria-label="Cargando retos">
      {[0, 1, 2].map((item) => (
        <div className="assessment-row skeleton-row" key={item}>
          <span className="skeleton skeleton-index" />
          <div className="assessment-copy">
            <span className="skeleton skeleton-meta" />
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-body" />
          </div>
        </div>
      ))}
    </div>
  );
}
