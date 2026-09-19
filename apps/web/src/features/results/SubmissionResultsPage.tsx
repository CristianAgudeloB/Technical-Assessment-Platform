import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getSubmissionResults, type PersistedTestResult, type SubmissionResults } from '../../api/submissions';
import { ApiError } from '../../api/http';

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'No fue posible cargar los resultados. Inténtalo de nuevo.';
}

function formatLanguage(language: string) {
  return language === 'JAVASCRIPT' ? 'JavaScript' : language[0] + language.slice(1).toLowerCase();
}

function formatTime(milliseconds: number) {
  return milliseconds < 1_000 ? `${milliseconds} ms` : `${(milliseconds / 1_000).toFixed(2)} s`;
}

function statusLabel(status: PersistedTestResult['status']) {
  const labels: Record<PersistedTestResult['status'], string> = {
    ACCEPTED: 'Aceptado',
    WRONG_ANSWER: 'Respuesta incorrecta',
    COMPILATION_ERROR: 'Error de compilación',
    RUNTIME_ERROR: 'Error de ejecución',
    TIME_LIMIT_EXCEEDED: 'Tiempo excedido',
    MEMORY_LIMIT_EXCEEDED: 'Memoria excedida',
    INTERNAL_ERROR: 'Error interno',
  };
  return labels[status];
}

function resultOutput(result: PersistedTestResult) {
  return result.compileOutput ?? result.stderr ?? result.stdout;
}

export function SubmissionResultsPage() {
  const { assessmentId, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [results, setResults] = useState<SubmissionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId || !submissionId) {
      setError('Falta el identificador del reto o del envío.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getSubmissionResults(submissionId, controller.signal)
      .then((loadedResults) => {
        if (loadedResults.assessmentId !== assessmentId) {
          throw new Error('Este envío no pertenece al reto seleccionado.');
        }

        setResults(loadedResults);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [assessmentId, submissionId]);

  if (loading) {
    return (
      <section className="results-page" aria-busy="true" aria-label="Cargando resultados del envío">
        <span className="skeleton skeleton-editor-back" />
        <span className="skeleton skeleton-editor-title" />
        <span className="skeleton skeleton-results-body" />
      </section>
    );
  }

  if (error || !results || !assessmentId) {
    return (
      <section className="results-page">
        <Link className="back-link" to={assessmentId && attemptId ? `/assessments/${assessmentId}/attempts/${attemptId}/results` : assessmentId ? `/assessments/${assessmentId}` : '/assessments'}>
          ← Volver al reto
        </Link>
        <div className="status-panel error-panel" role="alert">
          <span className="status-symbol">!</span>
          <div>
            <h2>Los resultados no están disponibles</h2>
            <p>{error ?? 'Los resultados solicitados no existen.'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="results-page" aria-labelledby="results-title">
      <Link className="back-link" to={attemptId ? `/assessments/${assessmentId}/attempts/${attemptId}/results` : `/assessments/${assessmentId}`}>← Volver al reto</Link>

      <header className="results-header">
        <div>
          <p className="section-kicker">Reporte de ejecución · Ejercicio {String(results.question.position).padStart(2, '0')}</p>
          <h1 id="results-title">Resultados</h1>
          <p className="results-question">{results.question.title} · {formatLanguage(results.language)}</p>
        </div>
        <div className="result-score" aria-label={`Puntaje ${results.score} por ciento`}>
          <span>Puntaje</span>
          <strong>{results.score}%</strong>
        </div>
      </header>

      <dl className="results-facts">
        <div><dt>Tests exitosos</dt><dd>{results.passedTests}<span> / {results.totalTests}</span></dd></div>
        <div><dt>Ejercicios correctos</dt><dd>{results.questionsCorrect}</dd></div>
        <div><dt>Ejercicios incorrectos</dt><dd>{results.questionsIncorrect}</dd></div>
        <div><dt>Tiempo consumido</dt><dd>{formatTime(results.timeConsumedMs)}<span> ejecución</span></dd></div>
      </dl>

      <section className="test-result-section" aria-labelledby="test-results-title">
        <div className="test-results-heading">
          <div>
            <p className="section-kicker">Evaluación guardada</p>
            <h2 id="test-results-title">Resultados de pruebas</h2>
          </div>
          <span>{results.failedTests === 0 ? 'Todas las pruebas fueron exitosas' : `${results.failedTests} prueba${results.failedTests === 1 ? '' : 's'} requiere atención`}</span>
        </div>
        <ol className="test-result-list">
          {results.testResults.map((result) => {
            const output = resultOutput(result);

            return (
              <li className="test-result-row" key={result.id}>
                <span className="test-number">{String(result.position).padStart(2, '0')}</span>
                <span className={`test-result-status ${result.passed ? 'accepted' : 'failed'}`}>
                  {statusLabel(result.status)}
                </span>
                <span className="test-result-metrics">
                  {result.isHidden ? 'Caso oculto · ' : ''}
                  {result.executionTimeMs === null ? 'Sin datos de ejecución' : formatTime(result.executionTimeMs)}
                  {result.memoryKb === null ? '' : ` · ${result.memoryKb} KB`}
                </span>
                {output ? <pre className="test-result-output">{output}</pre> : null}
              </li>
            );
          })}
        </ol>
      </section>
    </section>
  );
}
