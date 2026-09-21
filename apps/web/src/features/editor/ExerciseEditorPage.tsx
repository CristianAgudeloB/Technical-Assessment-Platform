import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  getQuestion,
  type PublicTestCase,
  type QuestionSummary,
} from '../../api/assessments';
import { getAssessmentAttempt, type AssessmentAttempt } from '../../api/assessment-attempts';
import { ApiError } from '../../api/http';
import { runCode, type CodeRunResult, type ProgrammingLanguage } from '../../api/submissions';
import { submissionExecutor } from './submission-executor';
import { useAssessmentCountdown } from '../assessment-attempts/useAssessmentCountdown';
import { loadEditorDraft, saveEditorDraft } from './editor-draft-storage';

loader.config({ monaco });

type EditorLanguage = {
  label: string;
  fileName: string;
  monacoLanguage: string;
  starterCode: string;
};

const LANGUAGE_CONFIG: Record<ProgrammingLanguage, EditorLanguage> = {
  JAVA: {
    label: 'Java',
    fileName: 'Main.java',
    monacoLanguage: 'java',
    starterCode: `import java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n\n    // Escribe tu solución aquí.\n  }\n}\n`,
  },
  JAVASCRIPT: {
    label: 'JavaScript',
    fileName: 'solution.js',
    monacoLanguage: 'javascript',
    starterCode: `'use strict';\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n// Escribe tu solución aquí.\n`,
  },
  PYTHON: {
    label: 'Python',
    fileName: 'solution.py',
    monacoLanguage: 'python',
    starterCode: `import sys\n\ninput_data = sys.stdin.read().strip()\n\n# Escribe tu solución aquí.\n`,
  },
  TYPESCRIPT: {
    label: 'TypeScript',
    fileName: 'solution.ts',
    monacoLanguage: 'typescript',
    starterCode: `import * as fs from 'node:fs';\n\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n// Escribe tu solución aquí.\n`,
  },
  COBOL: {
    label: 'COBOL',
    fileName: 'main.cob',
    monacoLanguage: 'plaintext',
    starterCode: `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. MAIN.\n\n       PROCEDURE DIVISION.\n           *> Escribe tu solución aquí.\n           STOP RUN.\n`,
  },
};

function isProgrammingLanguage(value: string): value is ProgrammingLanguage {
  return value in LANGUAGE_CONFIG;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'No fue posible cargar el ejercicio. Inténtalo de nuevo.';
}

function formatQuestionPosition(question: QuestionSummary) {
  return `Ejercicio ${String(question.position).padStart(2, '0')}`;
}

function executionStatusLabel(status: CodeRunResult['status']) {
  const labels: Record<CodeRunResult['status'], string> = {
    ACCEPTED: 'Ejecución finalizada',
    COMPILATION_ERROR: 'Error de compilación',
    RUNTIME_ERROR: 'Error de ejecución',
    TIME_LIMIT_EXCEEDED: 'Tiempo excedido',
    MEMORY_LIMIT_EXCEEDED: 'Memoria excedida',
    INTERNAL_ERROR: 'Error del motor',
  };

  return labels[status];
}

function compilationLabel(status: CodeRunResult['status']) {
  return status === 'COMPILATION_ERROR' ? 'Error de compilación' : 'Compilación exitosa';
}

function formatExecutionTime(milliseconds: number | null) {
  if (milliseconds === null) return 'Sin datos de tiempo';
  return milliseconds < 1_000 ? `${milliseconds} ms` : `${(milliseconds / 1_000).toFixed(2)} s`;
}

function isPublicExample(
  testCase: PublicTestCase,
): testCase is Extract<PublicTestCase, { isHidden: false }> {
  return !testCase.isHidden;
}

export function ExerciseEditorPage() {
  const { assessmentId, questionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [question, setQuestion] = useState<QuestionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage | ''>('');
  const [sourceByLanguage, setSourceByLanguage] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState<CodeRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitConfirmationOpen, setIsSubmitConfirmationOpen] = useState(false);
  const [isAdvancedEditor, setIsAdvancedEditor] = useState(false);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const countdown = useAssessmentCountdown(attempt);
  const isAttemptActive = attempt?.status === 'ACTIVE' && !countdown.isExpired;

  useEffect(() => {
    if (!assessmentId || !questionId || !attemptId) {
      setError('Inicia un reto temporizado antes de abrir el editor.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setQuestion(null);
    setError(null);
    setRunResult(null);
    setRunError(null);
    setSubmissionError(null);
    setIsSubmitConfirmationOpen(false);

    Promise.all([
      getQuestion(questionId, controller.signal),
      getAssessmentAttempt(assessmentId, attemptId, controller.signal),
    ])
      .then(([loadedQuestion, loadedAttempt]) => {
        if (loadedQuestion.assessmentId !== assessmentId) {
          throw new Error('Este ejercicio no pertenece al reto seleccionado.');
        }

        const draft = loadEditorDraft(attemptId, questionId);
        const selectedDraftLanguage = draft?.selectedLanguage;
        const selectedLanguage = selectedDraftLanguage && isProgrammingLanguage(selectedDraftLanguage) && loadedQuestion.allowedLanguages.includes(selectedDraftLanguage)
          ? selectedDraftLanguage
          : loadedQuestion.allowedLanguages[0] ?? '';

        setQuestion(loadedQuestion);
        setAttempt(loadedAttempt);
        setSelectedLanguage(selectedLanguage);
        setSourceByLanguage(draft?.sourceByLanguage ?? {});
        setStdin(draft?.stdin ?? '');
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
  }, [assessmentId, attemptId, questionId]);

  useEffect(() => {
    if (!attemptId || !questionId || !question || question.id !== questionId) return;

    saveEditorDraft(attemptId, questionId, { selectedLanguage, sourceByLanguage, stdin });
  }, [attemptId, question, questionId, selectedLanguage, sourceByLanguage, stdin]);

  useEffect(() => {
    if (!attemptId || !assessmentId || !countdown.isExpired || attempt?.status === 'EXPIRED') {
      return;
    }

    getAssessmentAttempt(assessmentId, attemptId)
      .then(setAttempt)
      .catch(() => undefined);
  }, [assessmentId, attempt?.status, attemptId, countdown.isExpired]);

  const language = selectedLanguage ? LANGUAGE_CONFIG[selectedLanguage] : undefined;
  const publicExamples = question?.testCases.filter(isPublicExample) ?? [];
  const sourceCode = useMemo(
    () => sourceByLanguage[selectedLanguage] ?? language?.starterCode ?? '',
    [language?.starterCode, selectedLanguage, sourceByLanguage],
  );

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isProgrammingLanguage(event.target.value)) {
      setSelectedLanguage(event.target.value);
    }
    setRunResult(null);
    setRunError(null);
    setSubmissionError(null);
  };

  const handleRunCode = async () => {
    if (!assessmentId || !attemptId || !questionId || !selectedLanguage || !sourceCode || !isAttemptActive) {
      return;
    }

    setIsRunning(true);
    setRunResult(null);
    setRunError(null);
    setSubmissionError(null);

    try {
      const result = await runCode({
        assessmentId,
        assessmentAttemptId: attemptId,
        questionId,
        language: selectedLanguage,
        sourceCode,
        stdin,
      });
      setRunResult(result);
    } catch (runCodeError: unknown) {
      setRunError(getErrorMessage(runCodeError));
    } finally {
      setIsRunning(false);
    }
  };

  const confirmSubmission = async () => {
    if (!assessmentId || !attemptId || !questionId || !selectedLanguage || !sourceCode || !isAttemptActive) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setIsSubmitConfirmationOpen(false);

    try {
      const feedback = await submissionExecutor.submit({
        assessmentAttemptId: attemptId,
        questionId,
        language: selectedLanguage,
        sourceCode,
      });
      navigate(`/assessments/${assessmentId}/submissions/${feedback.submissionId}/results?attemptId=${attemptId}`);
    } catch (submitError: unknown) {
      setSubmissionError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="exercise-editor-page" aria-busy="true" aria-label="Cargando ejercicio">
        <span className="skeleton skeleton-editor-back" />
        <span className="skeleton skeleton-editor-title" />
        <span className="skeleton skeleton-editor-workspace" />
      </section>
    );
  }

  if (error || !question || !assessmentId) {
    return (
      <section className="exercise-editor-page">
        <Link className="back-link" to={assessmentId ? `/assessments/${assessmentId}` : '/assessments'}>
          ← Volver al reto
        </Link>
        <div className="status-panel error-panel" role="alert">
          <span className="status-symbol">!</span>
          <div>
            <h2>El ejercicio no está disponible</h2>
            <p>{error ?? 'El ejercicio solicitado no existe.'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="exercise-editor-page" aria-labelledby="exercise-editor-title">
      <Link className="back-link" to={`/assessments/${assessmentId}?attemptId=${attemptId}`}>← Volver al reto</Link>

      <header className="exercise-header">
        <div>
          <p className="section-kicker">{formatQuestionPosition(question)} · {question.score} pts</p>
          <h1 id="exercise-editor-title">{question.title}</h1>
          <p className="exercise-description">{question.description}</p>
        </div>
        <div className={`assessment-countdown${countdown.isExpired ? ' expired' : ''}`} aria-live="polite">
          <span>{countdown.isCompleted ? 'Reto finalizado' : countdown.isExpired ? 'Tiempo agotado' : 'Tiempo restante'}</span>
          <strong>{countdown.isCompleted ? '—' : countdown.label}</strong>
        </div>
      </header>

      {publicExamples.length > 0 ? (
        <section className="editor-examples" aria-labelledby="editor-examples-title">
          <div className="editor-examples-heading">
            <div>
              <span>Referencia</span>
              <h2 id="editor-examples-title">Ejemplos de entrada y salida</h2>
            </div>
            <p>Úsalos para comprobar tu solución mientras programas.</p>
          </div>
          <div className="editor-example-list">
            {publicExamples.map((testCase, index) => (
              <article className="editor-example" key={testCase.id}>
                <span className="editor-example-number">Ejemplo {index + 1}</span>
                <div>
                  <span>Entrada</span>
                  <pre>{testCase.input || '(sin entrada)'}</pre>
                </div>
                <div>
                  <span>Salida esperada</span>
                  <pre>{testCase.expectedOutput || '(sin salida)'}</pre>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className={`editor-workspace${isAdvancedEditor ? ' advanced' : ''}`}>
        <div className="editor-toolbar">
          <div className="language-control">
            <label htmlFor="programming-language">Lenguaje de programación</label>
            <select
              id="programming-language"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              aria-label="Lenguaje de programación"
              disabled={isRunning || isSubmitting}
            >
              {question.allowedLanguages.map((allowedLanguage) => (
                <option key={allowedLanguage} value={allowedLanguage}>
                  {LANGUAGE_CONFIG[allowedLanguage]?.label ?? allowedLanguage}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-actions">
            <button
              aria-pressed={isAdvancedEditor}
              className="editor-mode-toggle"
              onClick={() => setIsAdvancedEditor((current) => !current)}
              type="button"
            >
              <span aria-hidden="true">{isAdvancedEditor ? '⊡' : '↗'}</span>
              {isAdvancedEditor ? 'Vista básica' : 'Vista ampliada'}
            </button>
            <button
              className="execute-button"
              type="button"
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting || !language || !isAttemptActive}
            >
              {isRunning ? <><span className="button-spinner" aria-hidden="true" />Ejecutando…</> : <>Ejecutar código <span aria-hidden="true">↗</span></>}
            </button>
            <button
              className="submit-solution-button"
              type="button"
              onClick={() => setIsSubmitConfirmationOpen(true)}
              disabled={isRunning || isSubmitting || !language || !isAttemptActive}
            >
              {isSubmitting ? 'Enviando…' : 'Enviar respuesta'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="editor-canvas">
          {isAdvancedEditor && (
            <aside className="editor-explorer" aria-label="Explorador de archivos">
              <div className="editor-explorer-heading"><span>Explorador</span><span aria-hidden="true">•••</span></div>
              <div className="editor-project-name"><span aria-hidden="true">⌄</span> Solución</div>
              <div aria-current="page" className="editor-file-item"><span aria-hidden="true">‹/›</span>{language?.fileName}</div>
              <p>Este reto contiene un único archivo de solución.</p>
            </aside>
          )}
          <div className="monaco-shell">
            {isAdvancedEditor && <div className="editor-file-tab"><span aria-hidden="true">‹/›</span>{language?.fileName}</div>}
            <div className="editor-instance">
              <Editor
                height="100%"
                language={language?.monacoLanguage ?? 'plaintext'}
                value={sourceCode}
                onChange={(value) => {
                  setSourceByLanguage((currentSource) => ({
                    ...currentSource,
                    [selectedLanguage]: value ?? '',
                  }));
                  setRunResult(null);
                  setRunError(null);
                  setSubmissionError(null);
                }}
                theme="vs-dark"
                options={{
                  automaticLayout: true,
                  ariaLabel: 'Editor de código de la solución',
                  bracketPairColorization: { enabled: isAdvancedEditor },
                  folding: isAdvancedEditor,
                  fontSize: 14,
                  glyphMargin: isAdvancedEditor,
                  lineHeight: 22,
                  minimap: { enabled: isAdvancedEditor },
                  padding: { top: isAdvancedEditor ? 14 : 18, bottom: 18 },
                  parameterHints: { enabled: isAdvancedEditor },
                  quickSuggestions: isAdvancedEditor,
                  scrollBeyondLastLine: false,
                  stickyScroll: { enabled: isAdvancedEditor },
                  suggest: { showWords: isAdvancedEditor },
                  tabSize: 2,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <section className="run-workspace" aria-label="Prueba de código">
        <label className="run-input-control" htmlFor="stdin">
          <span>Entrada de prueba <small>Opcional</small></span>
          <textarea
            id="stdin"
            maxLength={10_000}
            disabled={isRunning || isSubmitting}
            onChange={(event) => {
              setStdin(event.target.value);
              setRunResult(null);
              setRunError(null);
            }}
            placeholder="Escribe aquí la entrada estándar para probar tu código"
            value={stdin}
          />
        </label>

        <aside className="execution-placeholder" aria-live="polite">
          <p className="section-kicker">Resultado de la prueba</p>
          {isRunning ? (
            <div className="execution-progress" role="status"><span className="button-spinner" aria-hidden="true" />Ejecutando tu código en el sandbox…</div>
          ) : runResult ? (
            <div className="run-result">
              <div className={`run-status ${runResult.status === 'ACCEPTED' ? 'success' : 'error'}`}>
                <strong>{compilationLabel(runResult.status)}</strong>
                <span>{formatExecutionTime(runResult.executionTimeMs)}{runResult.memoryKb === null ? '' : ` · ${runResult.memoryKb} KB`}</span>
              </div>
              <p className="execution-result-summary">{executionStatusLabel(runResult.status)}</p>
              {runResult.compileOutput && <div className="console-block error"><span className="console-label">Detalle de compilación</span><pre>{runResult.compileOutput}</pre></div>}
              {runResult.stderr && <div className="console-block error"><span className="console-label">Detalle de ejecución</span><pre>{runResult.stderr}</pre></div>}
              {runResult.stdout !== null && <div className="console-block"><span className="console-label">Salida recibida</span><pre>{runResult.stdout || '(sin salida)'}</pre></div>}
              {runResult.message && <p className="execution-error">{runResult.message}</p>}
            </div>
          ) : runError ? (
            <p className="execution-error">No fue posible ejecutar la solución: {runError}</p>
          ) : countdown.isCompleted ? (
            <p className="execution-error">Este reto ya fue finalizado. Consulta los resultados para ver el resumen.</p>
          ) : countdown.isExpired ? (
            <p className="execution-error">El tiempo terminó. El servidor no aceptará más ejecuciones ni envíos para este intento.</p>
          ) : (
            <p>Esta prueba se ejecuta en el sandbox, no guarda una entrega ni afecta tu puntaje.</p>
          )}
        </aside>
      </section>

      {submissionError && <p className="submission-error" role="alert">No fue posible enviar la respuesta: {submissionError}</p>}

      {isSubmitConfirmationOpen && (
        <div className="submission-modal-backdrop" role="presentation">
          <section aria-describedby="submit-confirmation-description" aria-labelledby="submit-confirmation-title" aria-modal="true" className="submission-modal" role="dialog">
            <p className="section-kicker">Confirmar envío</p>
            <h2 id="submit-confirmation-title">¿Enviar tu respuesta?</h2>
            <p id="submit-confirmation-description">Se evaluará con todos los casos de prueba y el resultado contará para este ejercicio.</p>
            <div className="submission-modal-actions">
              <button className="modal-cancel-button" onClick={() => setIsSubmitConfirmationOpen(false)} type="button">Seguir editando</button>
              <button className="submit-solution-button" onClick={confirmSubmission} type="button">Sí, enviar respuesta <span aria-hidden="true">→</span></button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
