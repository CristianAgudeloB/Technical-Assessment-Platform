import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  AssessmentStatus,
  AssessmentSummary,
  getAssessment,
  listAssessmentQuestions,
  QuestionSummary,
} from '../../api/assessments';
import { ApiError } from '../../api/http';
import {
  AssessmentAttempt,
  AssessmentAttemptResult,
  getAssessmentAttempt,
  getAssessmentAttemptResults,
  startAssessmentAttempt,
} from '../../api/assessment-attempts';
import { useAssessmentCountdown } from '../assessment-attempts/useAssessmentCountdown';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'success'; assessment: AssessmentSummary; questions: QuestionSummary[] }
  | { kind: 'error'; message: string };

const statusLabel: Record<AssessmentStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

export function AssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [attemptResult, setAttemptResult] = useState<AssessmentAttemptResult | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const countdown = useAssessmentCountdown(attempt);

  useEffect(() => {
    if (!id) {
      setState({ kind: 'error', message: 'Se requiere el identificador del reto.' });
      return;
    }

    const controller = new AbortController();
    setState({ kind: 'loading' });
    setSelectedQuestionId(null);

    Promise.all([
      getAssessment(id, controller.signal),
      listAssessmentQuestions(id, controller.signal),
    ])
      .then(([assessment, questions]) => {
        setState({ kind: 'success', assessment, questions });
        setSelectedQuestionId(questions[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;

        const message =
          error instanceof ApiError
            ? error.message
            : 'No fue posible conectar con la API de retos. Confirma que el backend está en ejecución.';
        setState({ kind: 'error', message });
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!id || !attemptId) {
      setAttempt(null);
      setAttemptResult(null);
      return;
    }

    const controller = new AbortController();
    Promise.all([
      getAssessmentAttempt(id, attemptId, controller.signal),
      getAssessmentAttemptResults(id, attemptId, controller.signal),
    ])
      .then(([loadedAttempt, loadedResult]) => {
        setAttempt(loadedAttempt);
        setAttemptResult(loadedResult);
      })
      .catch(() => {
        setAttempt(null);
        setAttemptResult(null);
      });

    return () => controller.abort();
  }, [attemptId, id]);

  const selectedQuestion = useMemo(
    () =>
      state.kind === 'success'
        ? state.questions.find((question) => question.id === selectedQuestionId) ?? null
        : null,
    [selectedQuestionId, state],
  );

  const openSelectedQuestion = async () => {
    if (!id || !selectedQuestion || isStarting) return;

    if (attempt && attemptResult?.status === 'IN_PROGRESS' && !countdown.isExpired) {
      navigate(`/assessments/${id}/questions/${selectedQuestion.id}/editor?attemptId=${attempt.id}`);
      return;
    }

    if (attempt && attemptResult && (attemptResult.status !== 'IN_PROGRESS' || countdown.isExpired)) {
      navigate(`/assessments/${id}/attempts/${attempt.id}/results`);
      return;
    }

    setIsStarting(true);
    setStartError(null);

    try {
      const attempt = await startAssessmentAttempt(id);
      navigate(
        `/assessments/${id}/questions/${selectedQuestion.id}/editor?attemptId=${attempt.id}`,
      );
    } catch (error: unknown) {
      setStartError(error instanceof ApiError ? error.message : 'No fue posible iniciar el reto temporizado.');
    } finally {
      setIsStarting(false);
    }
  };

  if (state.kind === 'loading') {
    return <DetailSkeleton />;
  }

  if (state.kind === 'error') {
    return (
      <section className="detail-page" aria-labelledby="detail-title">
        <Link className="back-link" to="/assessments">← Volver a retos</Link>
        <div className="status-panel error-panel" role="alert">
          <span className="status-symbol" aria-hidden="true">!</span>
          <div>
            <h1 id="detail-title">El reto no está disponible</h1>
            <p>{state.message}</p>
          </div>
        </div>
      </section>
    );
  }

  const { assessment, questions } = state;
  const isActiveAttempt = attemptResult?.status === 'IN_PROGRESS' && !countdown.isExpired;
  const actionLabel = isActiveAttempt
    ? 'Abrir ejercicio'
    : attemptResult || attempt
      ? 'Ver resultados del reto'
      : 'Iniciar reto temporizado';

  return (
    <section className="detail-page" aria-labelledby="detail-title">
      <Link className="back-link" to="/assessments">← Volver a retos</Link>

      <header className="detail-header">
        <div>
          <div className="detail-status-line">
            <span className={`status-pill ${assessment.status.toLowerCase()}`}>
              {statusLabel[assessment.status]}
            </span>
            <span className="detail-slug">{assessment.slug}</span>
          </div>
          <p className="section-kicker">Reto técnico</p>
          <h1 id="detail-title">{assessment.name}</h1>
          <p className="detail-description">{assessment.description}</p>
        </div>
        <div className="assessment-status-note">
          <span className="connection-indicator" aria-hidden="true" />
          {isActiveAttempt ? 'Reto en curso' : attempt ? 'Reto finalizado' : 'Listo para iniciar'}
        </div>
      </header>

      <dl className="assessment-facts" aria-label="Resumen del reto">
        <div>
          <dt>Estado</dt>
          <dd>{statusLabel[assessment.status]}</dd>
        </div>
        <div>
          <dt>Duración</dt>
          <dd>{assessment.durationMinutes} min</dd>
        </div>
        <div>
          <dt>Tiempo disponible</dt>
          <dd>{attempt ? countdown.label : `${assessment.durationMinutes} min`} <span>{attempt ? 'restante' : 'al iniciar'}</span></dd>
        </div>
        <div>
          <dt>Puntaje acumulado</dt>
          <dd>{attemptResult ? `${attemptResult.score}%` : '—'} <span>{attemptResult ? `${attemptResult.completedQuestions}/${attemptResult.totalQuestions} respondidos` : 'sin intentos aún'}</span></dd>
        </div>
      </dl>

      <div className="questions-heading">
        <div>
          <p className="section-kicker">Ejercicios</p>
          <h2>Selecciona un ejercicio</h2>
        </div>
        <span className="question-count">{questions.length} configurados</span>
      </div>

      {questions.length === 0 ? (
        <div className="status-panel empty-panel">
          <span className="status-symbol" aria-hidden="true">+</span>
          <div>
            <h2>No hay ejercicios configurados</h2>
            <p>Agrega ejercicios desde el espacio de administración antes de abrir este reto.</p>
          </div>
        </div>
      ) : (
        <div className="question-workspace">
          <div className="question-picker" role="list" aria-label="Ejercicios del reto">
            {questions.map((question) => {
              const isSelected = question.id === selectedQuestionId;

              return (
                <button
                  className={`question-choice${isSelected ? ' selected' : ''}`}
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  type="button"
                  aria-pressed={isSelected}
                >
                  <span className="question-position">{String(question.position).padStart(2, '0')}</span>
                  <span className="question-choice-copy">
                    <strong>{question.title}</strong>
                    <small>{question.score} pts · {question.testCases.length} casos de prueba</small>
                  </span>
                  <span className="choice-state" aria-hidden="true">{isSelected ? '✓' : '→'}</span>
                </button>
              );
            })}
          </div>

          {selectedQuestion && (
            <aside className="question-preview" aria-live="polite">
              <p className="section-kicker">Ejercicio seleccionado</p>
              <h3>{selectedQuestion.title}</h3>
              <p>{selectedQuestion.description}</p>
              <div className="language-list" aria-label="Lenguajes permitidos">
                {selectedQuestion.allowedLanguages.map((language) => (
                  <span key={language}>{formatLanguage(language)}</span>
                ))}
              </div>
              <button
                className="editor-link"
                onClick={() => void openSelectedQuestion()}
                disabled={isStarting}
                type="button"
              >
                {isStarting ? 'Iniciando temporizador…' : actionLabel} <span aria-hidden="true">→</span>
              </button>
              {startError ? <p className="attempt-start-error" role="alert">{startError}</p> : null}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <section className="detail-page" aria-label="Cargando reto">
      <span className="skeleton skeleton-back" />
      <span className="skeleton skeleton-detail-title" />
      <span className="skeleton skeleton-detail-copy" />
      <div className="fact-skeletons">
        {[0, 1, 2, 3].map((item) => <span className="skeleton" key={item} />)}
      </div>
    </section>
  );
}

function formatLanguage(language: string) {
  const labels: Record<string, string> = {
    JAVA: 'Java',
    JAVASCRIPT: 'JavaScript',
    PYTHON: 'Python',
    TYPESCRIPT: 'TypeScript',
    COBOL: 'COBOL',
  };

  return labels[language] ?? language;
}
