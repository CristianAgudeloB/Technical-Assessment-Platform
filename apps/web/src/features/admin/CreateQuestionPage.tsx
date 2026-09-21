import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  createQuestion,
  getAssessment,
  listAssessmentQuestions,
  type AssessmentSummary,
} from '../../api/assessments';
import { ApiError } from '../../api/http';
import { programmingLanguages, type DraftTestCase, type ProgrammingLanguage } from './question-form';

export function CreateQuestionPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentSummary | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nextPosition, setNextPosition] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [score, setScore] = useState('50');
  const [allowedLanguages, setAllowedLanguages] = useState<ProgrammingLanguage[]>(['JAVA', 'JAVASCRIPT', 'PYTHON']);
  const [testCases, setTestCases] = useState<DraftTestCase[]>([{ input: '', expectedOutput: '', isHidden: false }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      setLoadError('Falta el identificador del reto.');
      setIsLoadingAssessment(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingAssessment(true);
    setLoadError(null);
    Promise.all([getAssessment(assessmentId, controller.signal), listAssessmentQuestions(assessmentId, controller.signal)])
      .then(([loadedAssessment, questions]) => {
        setAssessment(loadedAssessment);
        setNextPosition(questions.length + 1);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setLoadError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar el reto.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingAssessment(false);
      });
    return () => controller.abort();
  }, [assessmentId]);

  const toggleLanguage = (language: ProgrammingLanguage) => {
    setAllowedLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  };

  const updateTestCase = (index: number, patch: Partial<DraftTestCase>) => {
    setTestCases((current) => current.map((testCase, itemIndex) => itemIndex === index ? { ...testCase, ...patch } : testCase));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!assessmentId || !assessment || allowedLanguages.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await createQuestion(assessmentId, {
        title,
        description,
        position: nextPosition,
        score: Number(score),
        allowedLanguages,
        testCases: testCases.map((testCase, index) => ({ ...testCase, position: index + 1 })),
      });
      navigate(`/admin/assessments/${assessmentId}/edit`);
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear el ejercicio.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingAssessment) {
    return <section className="admin-form-page" aria-busy="true" aria-label="Cargando reto"><span className="skeleton skeleton-editor-title" /><span className="skeleton skeleton-results-body" /></section>;
  }

  if (loadError || !assessment) {
    return <section className="admin-form-page"><Link className="back-link" to={`/admin/assessments/${assessmentId}/edit`}>← Volver al reto</Link><div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h1>El reto no está disponible</h1><p>{loadError ?? 'No fue posible preparar el formulario del ejercicio.'}</p></div></div></section>;
  }

  return (
    <section className="admin-form-page" aria-labelledby="create-question-title">
      <Link className="back-link" to={`/admin/assessments/${assessmentId}/edit`}>← Volver al reto</Link>
      <header><h1 id="create-question-title">Agrega un ejercicio de programación</h1><p>Para {assessment.name}.</p></header>
      <form className="admin-form" aria-busy={submitting} onSubmit={submit}>
        <label>Título del ejercicio<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej.: Paréntesis balanceados" /></label>
        <label className="full-width">Instrucciones para el candidato<textarea required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe la entrada, salida esperada y casos límite." /></label>
        <label>Puntaje del ejercicio<input required min={0} type="number" value={score} onChange={(event) => setScore(event.target.value)} /></label>
        <fieldset className="language-checkboxes"><legend>Lenguajes permitidos</legend>{programmingLanguages.map((language) => <label key={language.value}><input checked={allowedLanguages.includes(language.value)} onChange={() => toggleLanguage(language.value)} type="checkbox" />{language.label}</label>)}</fieldset>
        <section className="test-case-builder full-width" aria-labelledby="test-cases-title">
          <div><h2 id="test-cases-title">Casos de prueba</h2></div>
          {testCases.map((testCase, index) => (
            <div className="test-case-form" key={index}>
              <strong>Caso {index + 1}</strong>
              <label>Entrada<textarea required value={testCase.input} onChange={(event) => updateTestCase(index, { input: event.target.value })} placeholder="Entrada estándar" /></label>
              <label>Salida esperada<textarea required value={testCase.expectedOutput} onChange={(event) => updateTestCase(index, { expectedOutput: event.target.value })} placeholder="Salida estándar esperada" /></label>
              <label className="visibility-toggle"><input checked={testCase.isHidden} onChange={(event) => updateTestCase(index, { isHidden: event.target.checked })} type="checkbox" />Ocultar este caso al candidato</label>
              {testCases.length > 1 && <button className="remove-case" onClick={() => setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">Eliminar</button>}
            </div>
          ))}
          <button className="add-case" disabled={testCases.length >= 10} onClick={() => setTestCases((current) => [...current, { input: '', expectedOutput: '', isHidden: true }])} type="button">+ Agregar caso de prueba</button>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><Link className="open-link" to={`/admin/assessments/${assessmentId}/edit`}>Cancelar</Link><button className="admin-primary-action" disabled={submitting || allowedLanguages.length === 0} type="submit">{submitting ? <><span className="button-spinner" aria-hidden="true" />Creando…</> : <>Crear ejercicio <span aria-hidden="true">→</span></>}</button></div>
      </form>
    </section>
  );
}
