import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { getQuestion, type QuestionSummary } from '../../api/assessments';
import { getAssessmentAttempt, type AssessmentAttempt } from '../../api/assessment-attempts';
import { ApiError } from '../../api/http';
import { type ProgrammingLanguage } from '../../api/submissions';
import { submissionExecutor, type SubmissionExecutionFeedback } from './submission-executor';
import { useAssessmentCountdown } from '../assessment-attempts/useAssessmentCountdown';

loader.config({ monaco });

type EditorLanguage = {
  label: string;
  monacoLanguage: string;
  starterCode: string;
};

const LANGUAGE_CONFIG: Record<string, EditorLanguage> = {
  JAVA: {
    label: 'Java',
    monacoLanguage: 'java',
    starterCode: `import java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n\n    // Escribe tu solución aquí.\n  }\n}\n`,
  },
  JAVASCRIPT: {
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    starterCode: `'use strict';\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n// Escribe tu solución aquí.\n`,
  },
  PYTHON: {
    label: 'Python',
    monacoLanguage: 'python',
    starterCode: `import sys\n\ninput_data = sys.stdin.read().strip()\n\n# Escribe tu solución aquí.\n`,
  },
  TYPESCRIPT: {
    label: 'TypeScript',
    monacoLanguage: 'typescript',
    starterCode: `import * as fs from 'node:fs';\n\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n// Escribe tu solución aquí.\n`,
  },
  COBOL: {
    label: 'COBOL',
    monacoLanguage: 'plaintext',
    starterCode: `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. MAIN.\n\n       PROCEDURE DIVISION.\n           *> Escribe tu solución aquí.\n           STOP RUN.\n`,
  },
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'No fue posible cargar el ejercicio. Inténtalo de nuevo.';
}

function formatQuestionPosition(question: QuestionSummary) {
  return `Ejercicio ${String(question.position).padStart(2, '0')}`;
}

export function ExerciseEditorPage() {
  const { assessmentId, questionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [question, setQuestion] = useState<QuestionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [sourceByLanguage, setSourceByLanguage] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionFeedback, setExecutionFeedback] = useState<SubmissionExecutionFeedback | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const countdown = useAssessmentCountdown(attempt);

  useEffect(() => {
    if (!assessmentId || !questionId || !attemptId) {
      setError('Inicia un reto temporizado antes de abrir el editor.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setExecutionFeedback(null);
    setExecutionError(null);

    Promise.all([
      getQuestion(questionId, controller.signal),
      getAssessmentAttempt(assessmentId, attemptId, controller.signal),
    ])
      .then(([loadedQuestion, loadedAttempt]) => {
        if (loadedQuestion.assessmentId !== assessmentId) {
          throw new Error('Este ejercicio no pertenece al reto seleccionado.');
        }

        setQuestion(loadedQuestion);
        setAttempt(loadedAttempt);
        setSelectedLanguage(loadedQuestion.allowedLanguages[0] ?? '');
        setSourceByLanguage({});
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
    if (!attemptId || !assessmentId || !countdown.isExpired || attempt?.status === 'EXPIRED') {
      return;
    }

    getAssessmentAttempt(assessmentId, attemptId)
      .then(setAttempt)
      .catch(() => undefined);
  }, [assessmentId, attempt?.status, attemptId, countdown.isExpired]);

  const language = LANGUAGE_CONFIG[selectedLanguage];
  const sourceCode = useMemo(
    () => sourceByLanguage[selectedLanguage] ?? language?.starterCode ?? '',
    [language?.starterCode, selectedLanguage, sourceByLanguage],
  );

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(event.target.value);
    setExecutionFeedback(null);
    setExecutionError(null);
  };

  const handleExecute = async () => {
    if (!assessmentId || !attemptId || !questionId || !selectedLanguage || !sourceCode || countdown.isExpired) {
      return;
    }

    setIsExecuting(true);
    setExecutionFeedback(null);
    setExecutionError(null);

    try {
      const feedback = await submissionExecutor.execute({
        assessmentAttemptId: attemptId,
        questionId,
        language: selectedLanguage as ProgrammingLanguage,
        sourceCode,
      });
      setExecutionFeedback(feedback);
      navigate(
        `/assessments/${assessmentId}/attempts/${attemptId}/results?submissionId=${feedback.submissionId}`,
      );
    } catch (submissionError: unknown) {
      setExecutionError(getErrorMessage(submissionError));
    } finally {
      setIsExecuting(false);
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
          <span>{countdown.isExpired ? 'Tiempo agotado' : 'Tiempo restante'}</span>
          <strong>{countdown.label}</strong>
          <small>{question.testCases.length} casos de prueba</small>
        </div>
      </header>

      <div className="editor-workspace">
        <div className="editor-toolbar">
          <div className="language-control">
            <label htmlFor="programming-language">Lenguaje de programación</label>
            <select
              id="programming-language"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              aria-label="Lenguaje de programación"
            >
              {question.allowedLanguages.map((allowedLanguage) => (
                <option key={allowedLanguage} value={allowedLanguage}>
                  {LANGUAGE_CONFIG[allowedLanguage]?.label ?? allowedLanguage}
                </option>
              ))}
            </select>
          </div>
          <button
            className="execute-button"
            type="button"
            onClick={handleExecute}
            disabled={isExecuting || !language || countdown.isExpired}
          >
            {isExecuting ? 'Ejecutando…' : 'Ejecutar'}
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="monaco-shell">
          <Editor
            height="100%"
            language={language?.monacoLanguage ?? 'plaintext'}
            value={sourceCode}
            onChange={(value) => {
              setSourceByLanguage((currentSource) => ({
                ...currentSource,
                [selectedLanguage]: value ?? '',
              }));
              setExecutionFeedback(null);
              setExecutionError(null);
            }}
            theme="vs-dark"
            options={{
              automaticLayout: true,
              fontSize: 14,
              lineHeight: 22,
              minimap: { enabled: false },
              padding: { top: 18, bottom: 18 },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      <aside className="execution-placeholder" aria-live="polite">
        <p className="section-kicker">Estado de ejecución</p>
        {executionFeedback ? (
          <p>{executionFeedback.message}</p>
        ) : executionError ? (
          <p className="execution-error">No fue posible ejecutar la solución: {executionError}</p>
        ) : countdown.isExpired ? (
          <p className="execution-error">El tiempo terminó. El servidor no aceptará más envíos para este intento.</p>
        ) : (
          <p>El servidor valida el tiempo restante antes de aceptar y ejecutar tu solución.</p>
        )}
      </aside>
    </section>
  );
}
