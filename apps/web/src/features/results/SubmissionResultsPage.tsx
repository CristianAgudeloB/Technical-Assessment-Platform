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

function compilationSummary(results: SubmissionResults) {
  return results.testResults.some((result) => result.status === 'COMPILATION_ERROR')
    ? 'Error de compilación'
    : 'Compilación exitosa';
}

function qualityStatusLabel(status: NonNullable<SubmissionResults['quality']>['status']) {
  const labels = {
    PENDING: 'Analizando',
    COMPLETED: 'Análisis completado',
    SKIPPED: 'No disponible para este lenguaje',
    FAILED: 'Análisis no disponible',
  } as const;
  return labels[status];
}

function qualityTypeLabel(type: NonNullable<SubmissionResults['quality']>['issues'][number]['type']) {
  const labels = {
    BUG: 'Posible error',
    CODE_SMELL: 'Code smell',
    VULNERABILITY: 'Vulnerabilidad',
  } as const;
  return labels[type];
}

export function SubmissionResultsPage() {
  const { assessmentId, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [results, setResults] = useState<SubmissionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityRefresh, setQualityRefresh] = useState(0);

  useEffect(() => {
    if (!assessmentId || !submissionId) {
      setError('Falta el identificador del reto o del envío.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    // Keep the functional result on screen while the optional report refreshes.
    if (qualityRefresh === 0) {
      setLoading(true);
    }
    setError(null);

    let qualityRefreshTimer: ReturnType<typeof setTimeout> | undefined;

    getSubmissionResults(submissionId, controller.signal)
      .then((loadedResults) => {
        if (loadedResults.assessmentId !== assessmentId) {
          throw new Error('Este envío no pertenece al reto seleccionado.');
        }

        setResults(loadedResults);
        if (loadedResults.quality?.status === 'PENDING') {
          qualityRefreshTimer = setTimeout(() => setQualityRefresh((current) => current + 1), 2_000);
        }
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

    return () => {
      controller.abort();
      if (qualityRefreshTimer) clearTimeout(qualityRefreshTimer);
    };
  }, [assessmentId, qualityRefresh, submissionId]);

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
          <p className="results-question">{results.question.title} · {formatLanguage(results.language)} · {compilationSummary(results)}</p>
        </div>
        <div className="result-score" aria-label={`Puntaje ${results.score} por ciento`}>
          <span>Puntaje</span>
          <strong>{results.score}%</strong>
        </div>
      </header>

      <dl className="results-facts">
        <div><dt>Pruebas aprobadas</dt><dd>{results.passedTests}<span> / {results.totalTests}</span></dd></div>
        <div><dt>Pruebas fallidas</dt><dd>{results.failedTests}</dd></div>
        <div><dt>Compilación</dt><dd><span className={`compilation-state${compilationSummary(results) === 'Compilación exitosa' ? ' success' : ' error'}`}>{compilationSummary(results)}</span></dd></div>
        <div><dt>Tiempo de ejecución</dt><dd>{formatTime(results.timeConsumedMs)}</dd></div>
      </dl>

      <section className="test-result-section" aria-labelledby="test-results-title">
        <div className="test-results-heading">
          <div>
            <p className="section-kicker">Evaluación guardada</p>
            <h2 id="test-results-title">Resultados de pruebas</h2>
          </div>
          <span>{results.passedTests} / {results.totalTests} pruebas aprobadas</span>
        </div>
        <ol className="test-result-list">
          {results.testResults.map((result) => {
            const output = resultOutput(result);
            const isWrongAnswer = result.status === 'WRONG_ANSWER';

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
                {isWrongAnswer && !result.isHidden ? (
                  <div className="test-result-comparison">
                    <div><span>Esperado</span><pre>{result.expectedOutput ?? '(sin valor esperado)'}</pre></div>
                    <div><span>Recibido</span><pre>{result.stdout ?? '(sin salida)'}</pre></div>
                  </div>
                ) : output ? <pre className="test-result-output">{output}</pre> : null}
              </li>
            );
          })}
        </ol>
      </section>

      {results.quality ? (
        <section className="quality-result-section" aria-labelledby="quality-results-title">
          <div className="quality-results-heading">
            <div>
              <p className="section-kicker">SonarQube Community Build</p>
              <h2 id="quality-results-title">Calidad del código</h2>
            </div>
            <span className={`quality-status ${results.quality.status.toLowerCase()}`}>
              {qualityStatusLabel(results.quality.status)}
            </span>
          </div>

          {results.quality.status === 'COMPLETED' ? (
            <>
              <dl className="quality-facts">
                <div><dt>Hallazgos</dt><dd>{results.quality.totalIssues}</dd></div>
                <div><dt>Posibles errores</dt><dd>{results.quality.bugs}</dd></div>
                <div><dt>Code smells</dt><dd>{results.quality.codeSmells}</dd></div>
                <div><dt>Vulnerabilidades</dt><dd>{results.quality.vulnerabilities}</dd></div>
              </dl>
              {results.quality.issues.length > 0 ? (
                <ul className="quality-issue-list">
                  {results.quality.issues.map((issue, index) => (
                    <li key={`${issue.rule}-${issue.line ?? 'global'}-${index}`}>
                      <span className={`quality-issue-type ${issue.type.toLowerCase()}`}>
                        {qualityTypeLabel(issue.type)}
                      </span>
                      <div>
                        <strong>{issue.message}</strong>
                        <small>{issue.rule}{issue.line === null ? '' : ` · línea ${issue.line}`} · {issue.severity}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="quality-empty">No se detectaron hallazgos en este envío.</p>}
            </>
          ) : (
            <p className="quality-message">{results.quality.message ?? 'El análisis de calidad se procesará sin afectar tu puntaje funcional.'}</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
