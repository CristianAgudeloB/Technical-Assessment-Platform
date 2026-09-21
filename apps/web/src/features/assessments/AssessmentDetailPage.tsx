import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
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
  getCurrentAssessmentAttempt,
  getAssessmentAttemptResults,
  startAssessmentAttempt,
} from '../../api/assessment-attempts';
import { useAssessmentCountdown } from '../assessment-attempts/useAssessmentCountdown';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'success'; assessment: AssessmentSummary; questions: QuestionSummary[] }
  | { kind: 'error'; message: string };

function formatConsumedTime(totalSeconds: number | null) {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function formatAvailability(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function questionCompletionLabel(
  state: AssessmentAttemptResult['questions'][number]['state'],
) {
  return state === 'ACCEPTED' ? 'Completado · Aceptado' : 'Completado · Incorrecto';
}

export function AssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [attemptResult, setAttemptResult] = useState<AssessmentAttemptResult | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isQuestionInfoOpen, setIsQuestionInfoOpen] = useState(false);
  const [isStartConfirmationOpen, setIsStartConfirmationOpen] = useState(false);
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
    setIsQuestionInfoOpen(false);
    setIsStartConfirmationOpen(false);

    Promise.all([
      getAssessment(id, controller.signal),
      listAssessmentQuestions(id, controller.signal),
    ])
      .then(([assessment, questions]) => {
        setState({ kind: 'success', assessment, questions });
        setSelectedQuestionId((current) => current ?? questions[0]?.id ?? null);
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
    if (!id) {
      setAttempt(null);
      setAttemptResult(null);
      return;
    }

    const controller = new AbortController();
    const loadAttempt = attemptId
      ? getAssessmentAttempt(id, attemptId, controller.signal)
      : getCurrentAssessmentAttempt(id, controller.signal);

    loadAttempt
      .then(async (loadedAttempt) => {
        if (!loadedAttempt) {
          setAttempt(null);
          setAttemptResult(null);
          return;
        }

        const loadedResult = await getAssessmentAttemptResults(
          id,
          loadedAttempt.id,
          controller.signal,
        );
        if (controller.signal.aborted) return;

        setAttempt(loadedAttempt);
        setAttemptResult(loadedResult);
        const nextPendingQuestion = loadedResult.questions.find(({ state }) => state === 'PENDING');
        if (nextPendingQuestion) setSelectedQuestionId(nextPendingQuestion.id);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
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

    const selectedProgress = attemptResult?.questions.find(
      (question) => question.id === selectedQuestion.id,
    );
    if (selectedProgress && selectedProgress.state !== 'PENDING') {
      if (attempt) {
        navigate(`/assessments/${id}/attempts/${attempt.id}/results`);
      }
      return;
    }

    if (attempt && attemptResult?.status === 'IN_PROGRESS' && !countdown.isExpired) {
      navigate(`/assessments/${id}/questions/${selectedQuestion.id}/editor?attemptId=${attempt.id}`);
      return;
    }

    if (attempt && attemptResult && (attemptResult.status !== 'IN_PROGRESS' || countdown.isExpired)) {
      navigate(`/assessments/${id}/attempts/${attempt.id}/results`);
      return;
    }

    setIsStarting(true);
    setIsStartConfirmationOpen(false);
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

  const requestOpenSelectedQuestion = () => {
    if (!attempt) {
      setIsStartConfirmationOpen(true);
      return;
    }

    void openSelectedQuestion();
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
  const isCompletedAttempt = attemptResult?.status === 'COMPLETED' || attempt?.status === 'COMPLETED';
  const isActiveAttempt = attempt?.status === 'ACTIVE' && attemptResult?.status === 'IN_PROGRESS' && !countdown.isExpired;
  const selectedQuestionProgress = selectedQuestion
    ? attemptResult?.questions.find((question) => question.id === selectedQuestion.id)
    : undefined;
  const isSelectedQuestionCompleted = selectedQuestionProgress?.state !== undefined
    && selectedQuestionProgress.state !== 'PENDING';
  const timeLabel = isCompletedAttempt
    ? 'Tiempo consumido'
    : attempt
      ? 'Tiempo restante'
      : 'Tiempo disponible';
  const shouldShowResultsLink = Boolean(
    attempt
      && (isSelectedQuestionCompleted || attemptResult?.status !== 'IN_PROGRESS' || countdown.isExpired),
  );
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
          <h1 id="detail-title">{assessment.name}</h1>
          <p className="detail-description">{assessment.description}</p>
          {assessment.availableFrom && assessment.availableUntil && (
            <p className="detail-availability">
              Disponible del {formatAvailability(assessment.availableFrom)} al {formatAvailability(assessment.availableUntil)}
            </p>
          )}
        </div>
        <div className="assessment-status-note">
          <span className="connection-indicator" aria-hidden="true" />
          {isActiveAttempt ? 'Reto en curso' : attempt ? 'Reto finalizado' : 'Listo para iniciar'}
        </div>
      </header>

      <dl className="assessment-facts" aria-label="Resumen del reto">
        <div>
          <dt>{timeLabel}</dt>
          <dd>
            {isCompletedAttempt
              ? formatConsumedTime(attemptResult?.timeConsumedSeconds ?? attempt?.timeConsumedSeconds ?? null)
              : attempt ? countdown.label : `${assessment.durationMinutes} min`}
            {' '}<span>{isCompletedAttempt ? 'reto finalizado' : attempt ? 'en curso' : 'al iniciar'}</span>
          </dd>
        </div>
        <div>
          <dt>Puntaje acumulado</dt>
          <dd>{attemptResult ? `${attemptResult.score}%` : '—'} <span>{attemptResult ? `${attemptResult.completedQuestions}/${attemptResult.totalQuestions} respondidos` : 'sin intentos aún'}</span></dd>
        </div>
      </dl>

      <div className="questions-heading">
        <div>
          <h2>Selecciona un ejercicio</h2>
        </div>
        <div className="questions-heading-actions">
          {attempt && attemptResult ? (
            <Link className="open-link assessment-results-link" to={`/assessments/${id}/attempts/${attempt.id}/results`}>
              Ver resultados del reto <span aria-hidden="true">→</span>
            </Link>
          ) : null}
          <span className="question-count">{questions.length} ejercicios</span>
        </div>
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
              const progress = attemptResult?.questions.find((result) => result.id === question.id);
              const isCompleted = progress !== undefined && progress.state !== 'PENDING';

              return (
                <button
                  className={`question-choice${isSelected ? ' selected' : ''}${isCompleted ? ' completed' : ''}`}
                  key={question.id}
                  onClick={() => {
                    setSelectedQuestionId(question.id);
                    setIsQuestionInfoOpen(true);
                    setIsStartConfirmationOpen(false);
                  }}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isCompleted}
                >
                  <span className="question-position">{String(question.position).padStart(2, '0')}</span>
                  <span className="question-choice-copy">
                    <strong>{question.title}</strong>
                    <small>
                      {isCompleted && progress
                        ? questionCompletionLabel(progress.state)
                        : `${question.score} pts`}
                    </small>
                  </span>
                  <span className="choice-state" aria-hidden="true">{isCompleted ? '✓' : '→'}</span>
                </button>
              );
            })}
          </div>

          {selectedQuestion && isQuestionInfoOpen ? (
            <section className="question-information-panel" aria-live="polite" aria-labelledby="question-information-title">
              <div className="question-information-heading">
                <span>Ejercicio {String(selectedQuestion.position).padStart(2, '0')}</span>
                <button className="question-information-close" onClick={() => setIsQuestionInfoOpen(false)} type="button">Cerrar <span aria-hidden="true">×</span></button>
              </div>
              <div className="question-information-content">
                <div>
                  <h3 id="question-information-title">{selectedQuestion.title}</h3>
                  <p>{selectedQuestion.description}</p>
                  <div className="question-information-meta">
                    <div><span>Lenguajes disponibles</span><div className="language-list" aria-label="Lenguajes permitidos">{selectedQuestion.allowedLanguages.map((language) => <span key={language}>{formatLanguage(language)}</span>)}</div></div>
                  </div>
                </div>
                <aside className="question-information-action">
                  <strong>Antes de comenzar</strong>
                  <p>Lee la consigna y valida tu solución con una entrada de prueba antes de enviarla.</p>
                  {shouldShowResultsLink ? (
                    <Link className="editor-link" to={`/assessments/${id}/attempts/${attempt?.id}/results`}>
                      Ver resultados del reto <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <button
                      className="editor-link"
                      onClick={requestOpenSelectedQuestion}
                      disabled={isStarting}
                      type="button"
                    >
                      {isStarting ? 'Iniciando temporizador…' : actionLabel} <span aria-hidden="true">→</span>
                    </button>
                  )}
                  {startError ? <p className="attempt-start-error" role="alert">{startError}</p> : null}
                </aside>
              </div>
            </section>
          ) : null}
        </div>
      )}

      {isStartConfirmationOpen ? (
        <div className="start-assessment-modal-backdrop">
          <section className="start-assessment-modal" aria-labelledby="start-assessment-modal-title" aria-modal="true" role="dialog">
            <p className="section-kicker">Reto temporizado</p>
            <h2 id="start-assessment-modal-title">¿Iniciar el reto?</h2>
            <p>El tiempo empezará a contar al abrir este primer ejercicio y seguirá corriendo hasta que termines todos los ejercicios del reto.</p>
            <div className="start-assessment-modal-actions">
              <button className="modal-cancel-button" onClick={() => setIsStartConfirmationOpen(false)} type="button">Cancelar</button>
              <button className="start-assessment-confirm" disabled={isStarting} onClick={() => void openSelectedQuestion()} type="button">
                {isStarting ? <><span className="button-spinner" aria-hidden="true" />Iniciando…</> : 'Iniciar y abrir ejercicio'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
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
