import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  getAssessmentAttemptResults,
  type AssessmentAttemptResult,
} from '../../api/assessment-attempts';
import { ApiError } from '../../api/http';

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes} min ${String(totalSeconds % 60).padStart(2, '0')} s`;
}

function stateLabel(state: AssessmentAttemptResult['questions'][number]['state']) {
  return state === 'PENDING' ? 'Pendiente' : state === 'ACCEPTED' ? 'Aceptado' : 'Incorrecto';
}

function attemptStatusLabel(status: AssessmentAttemptResult['status']) {
  return status === 'IN_PROGRESS' ? 'en curso' : status === 'EXPIRED' ? 'expirado' : 'finalizado';
}

export function AssessmentResultsPage() {
  const { assessmentId, attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId || !attemptId) {
      setError('Falta el identificador del intento.');
      return;
    }

    const controller = new AbortController();
    setError(null);
    getAssessmentAttemptResults(assessmentId, attemptId, controller.signal)
      .then(setResult)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar los resultados.');
      });

    return () => controller.abort();
  }, [assessmentId, attemptId]);

  const detailPath = assessmentId && attemptId ? `/assessments/${assessmentId}?attemptId=${attemptId}` : '/assessments';
  const latestSubmissionId = searchParams.get('submissionId');

  if (error) {
    return (
      <section className="results-page">
        <Link className="back-link" to={detailPath}>← Volver al reto</Link>
        <div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h2>Los resultados no están disponibles</h2><p>{error}</p></div></div>
      </section>
    );
  }

  if (!result) {
    return <section className="results-page" aria-busy="true"><span className="skeleton skeleton-editor-title" /><span className="skeleton skeleton-results-body" /></section>;
  }

  const isInProgress = result.status === 'IN_PROGRESS';

  return (
    <section className="results-page" aria-labelledby="assessment-results-title">
      <Link className="back-link" to={detailPath}>← Volver al reto</Link>
      <header className="results-header">
        <div>
          <p className="section-kicker">Resultado del reto · {attemptStatusLabel(result.status)}</p>
          <h1 id="assessment-results-title">{isInProgress ? 'Progreso del reto' : 'Resultados finales'}</h1>
          <p className="results-question">{result.completedQuestions} de {result.totalQuestions} ejercicios evaluados</p>
        </div>
        <div className="result-score"><span>Puntaje total</span><strong>{result.score}%</strong></div>
      </header>

      <dl className="results-facts">
        <div><dt>Ejercicios correctos</dt><dd>{result.questionsCorrect}</dd></div>
        <div><dt>Ejercicios incorrectos</dt><dd>{result.questionsIncorrect}</dd></div>
        <div><dt>Pendientes</dt><dd>{result.questionsPending}</dd></div>
        <div><dt>Tiempo consumido</dt><dd>{formatTime(result.timeConsumedSeconds)}</dd></div>
      </dl>

      <section className="test-result-section" aria-labelledby="assessment-question-results-title">
        <div className="test-results-heading"><div><p className="section-kicker">Resumen de ejercicios</p><h2 id="assessment-question-results-title">Ejercicios del reto</h2></div></div>
        <ol className="test-result-list">
          {result.questions.map((question) => (
            <li className="assessment-question-result" key={question.id}>
              <span className="test-number">{String(question.position).padStart(2, '0')}</span>
              <span className={`test-result-status ${question.state === 'ACCEPTED' ? 'accepted' : question.state === 'PENDING' ? 'pending' : 'failed'}`}>{stateLabel(question.state)}</span>
              <strong>{question.title}</strong>
              <span className="test-result-metrics">{question.submissionScore === null ? 'Sin envío' : `${question.submissionScore}% en el último envío`}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="result-actions">
        {isInProgress && <Link className="editor-link" to={detailPath}>Continuar reto <span aria-hidden="true">→</span></Link>}
        {latestSubmissionId && assessmentId && <Link className="open-link" to={`/assessments/${assessmentId}/submissions/${latestSubmissionId}/results?attemptId=${attemptId}`}>Ver último reporte de pruebas <span aria-hidden="true">→</span></Link>}
      </div>
    </section>
  );
}
