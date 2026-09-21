import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  getAdminAssessmentResultDetail,
  type AdminAssessmentResultDetail,
} from '../../api/admin-results';
import { ApiError } from '../../api/http';

const statusLabel: Record<AdminAssessmentResultDetail['status'], string> = {
  ACTIVE: 'En curso',
  COMPLETED: 'Finalizado',
  EXPIRED: 'Expirado',
};

const languageLabel: Record<string, string> = {
  JAVA: 'Java',
  JAVASCRIPT: 'JavaScript',
  PYTHON: 'Python',
  TYPESCRIPT: 'TypeScript',
  COBOL: 'COBOL',
};

function qualityStatusLabel(status: SubmissionQuality['status']) {
  const labels = {
    PENDING: 'Analizando',
    COMPLETED: 'Análisis completado',
    SKIPPED: 'No disponible para este lenguaje',
    FAILED: 'Análisis no disponible',
  } as const;
  return labels[status];
}

function qualityTypeLabel(type: SubmissionQuality['issues'][number]['type']) {
  const labels = {
    BUG: 'Posible error',
    CODE_SMELL: 'Code smell',
    VULNERABILITY: 'Vulnerabilidad',
  } as const;
  return labels[type];
}

export function AdminResultDetailPage() {
  const { attemptId } = useParams();
  const [detail, setDetail] = useState<AdminAssessmentResultDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setError('Falta el identificador del resultado.');
      return;
    }

    const controller = new AbortController();
    getAdminAssessmentResultDetail(attemptId, controller.signal)
      .then(setDetail)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof ApiError ? reason.message : 'No fue posible cargar el detalle del resultado.');
      });
    return () => controller.abort();
  }, [attemptId]);

  const answeredQuestions = useMemo(
    () => detail?.questions.filter(({ submission }) => submission !== null).length ?? 0,
    [detail],
  );

  if (error) {
    return <section className="admin-result-detail-page"><Link className="back-link" to="/admin/results">← Volver a resultados</Link><div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h1>El resultado no está disponible</h1><p>{error}</p></div></div></section>;
  }

  if (!detail) {
    return <section className="admin-result-detail-page" aria-busy="true"><span className="skeleton skeleton-editor-title" /><span className="skeleton skeleton-results-body" /></section>;
  }

  return (
    <section className="admin-result-detail-page" aria-labelledby="admin-result-detail-title">
      <Link className="back-link" to="/admin/results">← Volver a resultados</Link>
      <header className="admin-result-detail-header">
        <div>
          <p className="section-kicker">Resultado de candidato</p>
          <h1 id="admin-result-detail-title">{detail.assessment.name}</h1>
          <p>{detail.candidate.displayName} · {detail.candidate.email}</p>
        </div>
        <span className={`admin-result-status ${detail.status.toLowerCase()}`}>{statusLabel[detail.status]}</span>
      </header>

      <dl className="admin-result-detail-facts">
        <div><dt>Puntaje total</dt><dd>{detail.score === null ? '—' : `${detail.score}%`}</dd></div>
        <div><dt>Ejercicios enviados</dt><dd>{answeredQuestions}/{detail.totalQuestions}</dd></div>
        <div><dt>Correctos</dt><dd>{detail.questionsCorrect}</dd></div>
        <div><dt>Tiempo consumido</dt><dd>{formatCompactDuration(detail.timeConsumedSeconds)}</dd></div>
      </dl>

      <section className="admin-submission-review" aria-labelledby="submission-review-title">
        <div className="admin-list-heading"><div><p className="section-kicker">Entregas</p><h2 id="submission-review-title">Código y resultados por ejercicio</h2></div><span>{detail.questions.length} ejercicios</span></div>
        <div className="admin-submission-list">
          {detail.questions.map((question) => {
            const submission = question.submission;
            const passedTests = submission?.tests.filter(({ status }) => status === 'ACCEPTED').length ?? 0;
            const failedTests = (submission?.tests.length ?? 0) - passedTests;
            const hasCompilationError = submission?.tests.some(({ status }) => status === 'COMPILATION_ERROR') ?? false;
            return (
              <article className="admin-submission-card" key={question.id}>
                <header>
                  <div><span>Ejercicio {String(question.position).padStart(2, '0')}</span><h3>{question.title}</h3></div>
                  <strong>{submission?.score === null || !submission ? 'Sin envío' : `${submission.score}%`}</strong>
                </header>
                {submission ? (
                  <>
                    <div className="admin-submission-meta">
                      <span>{languageLabel[submission.language] ?? submission.language}</span>
                      <span className={hasCompilationError ? 'admin-compilation-state error' : 'admin-compilation-state'}>{hasCompilationError ? 'Error de compilación' : 'Compilación exitosa'}</span>
                      <span>{passedTests}/{submission.tests.length} casos aprobados{failedTests > 0 ? ` · ${failedTests} fallidos` : ''}</span>
                    </div>
                    <QualityReport quality={submission.quality} questionTitle={question.title} />
                    <pre aria-label={`Código enviado para ${question.title}`}><code>{submission.sourceCode}</code></pre>
                    <div className="admin-test-cases" aria-label="Casos de prueba">
                      {submission.tests.map((test) => (
                        <details className={`admin-test-case ${test.status === 'ACCEPTED' ? 'accepted' : 'failed'}`} key={`${question.id}-${test.position}`}>
                          <summary>
                            <span>Caso {test.position}</span>
                            <strong>{testStatusLabel(test.status)}</strong>
                            {test.isHidden && <small>Oculto para el candidato</small>}
                            <span className="admin-test-case-action">Ver datos</span>
                          </summary>
                          <div className="admin-test-case-data">
                            <TestCaseData label="Entrada" value={test.input} />
                            <TestCaseData label="Salida esperada" value={test.expectedOutput} />
                            <TestCaseData label="Salida obtenida" value={test.stdout ?? ''} />
                          </div>
                        </details>
                      ))}
                    </div>
                  </>
                ) : <p className="admin-no-submission">El candidato aún no ha enviado una solución para este ejercicio.</p>}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

type SubmissionQuality = NonNullable<NonNullable<AdminAssessmentResultDetail['questions'][number]['submission']>['quality']>;

function QualityReport({ quality, questionTitle }: { quality: SubmissionQuality | null; questionTitle: string }) {
  if (!quality) return null;

  const isCompleted = quality.status === 'COMPLETED';
  return (
    <details className="admin-quality-report">
      <summary>
        <span>Calidad del código</span>
        <strong className={quality.status.toLowerCase()}>{qualityStatusLabel(quality.status)}</strong>
        {isCompleted && <small>{quality.totalIssues} {quality.totalIssues === 1 ? 'hallazgo' : 'hallazgos'}</small>}
        <span className="admin-test-case-action">Ver resultados</span>
      </summary>
      <div className="admin-quality-report-body">
        {isCompleted ? (
          <>
            <dl className="admin-quality-facts">
              <div><dt>Hallazgos</dt><dd>{quality.totalIssues}</dd></div>
              <div><dt>Posibles errores</dt><dd>{quality.bugs}</dd></div>
              <div><dt>Code smells</dt><dd>{quality.codeSmells}</dd></div>
              <div><dt>Vulnerabilidades</dt><dd>{quality.vulnerabilities}</dd></div>
            </dl>
            {quality.issues.length > 0 ? (
              <ul className="admin-quality-issues" aria-label={`Hallazgos de calidad para ${questionTitle}`}>
                {quality.issues.map((issue, index) => (
                  <li key={`${issue.rule}-${issue.line ?? 'global'}-${index}`}>
                    <span className={`quality-issue-type ${issue.type.toLowerCase()}`}>{qualityTypeLabel(issue.type)}</span>
                    <div><strong>{issue.message}</strong><small>{issue.rule}{issue.line === null ? '' : ` · línea ${issue.line}`} · {issue.severity}</small></div>
                  </li>
                ))}
              </ul>
            ) : <p className="admin-quality-empty">No se detectaron hallazgos en este envío.</p>}
          </>
        ) : <p className="admin-quality-empty">{quality.message ?? 'El análisis se procesa sin afectar el puntaje funcional.'}</p>}
      </div>
    </details>
  );
}

function formatCompactDuration(totalSeconds: number | null) {
  if (totalSeconds === null) return '—';
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function testStatusLabel(status: NonNullable<AdminAssessmentResultDetail['questions'][number]['submission']>['tests'][number]['status']) {
  const labels: Record<typeof status, string> = {
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

function TestCaseData({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><pre>{value || '(vacío)'}</pre></div>;
}
