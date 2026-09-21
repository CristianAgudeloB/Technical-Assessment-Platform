import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getAdminQuestion, updateQuestion, type AdminQuestionDetails } from '../../api/assessments';
import { ApiError } from '../../api/http';
import { programmingLanguages, type DraftTestCase, type ProgrammingLanguage } from './question-form';

export function EditQuestionPage() {
  const { assessmentId, questionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<AdminQuestionDetails | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [score, setScore] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<ProgrammingLanguage[]>([]);
  const [testCases, setTestCases] = useState<DraftTestCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!questionId) {
      setError('Falta el identificador del ejercicio.');
      return;
    }

    const controller = new AbortController();
    getAdminQuestion(questionId, controller.signal)
      .then((loadedQuestion) => {
        setQuestion(loadedQuestion);
        setTitle(loadedQuestion.title);
        setDescription(loadedQuestion.description);
        setScore(String(loadedQuestion.score));
        setAllowedLanguages(loadedQuestion.allowedLanguages);
        setTestCases(loadedQuestion.testCases.map(({ input, expectedOutput, isHidden }) => ({ input, expectedOutput, isHidden })));
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof ApiError ? reason.message : 'No fue posible cargar el ejercicio.');
      });
    return () => controller.abort();
  }, [questionId]);

  const toggleLanguage = (language: ProgrammingLanguage) => {
    setAllowedLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  };

  const updateTestCase = (index: number, patch: Partial<DraftTestCase>) => {
    setTestCases((current) => current.map((testCase, itemIndex) => itemIndex === index ? { ...testCase, ...patch } : testCase));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!questionId || !question || allowedLanguages.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateQuestion(questionId, {
        title,
        description,
        position: question.position,
        score: Number(score),
        allowedLanguages,
        testCases: testCases.map((testCase, index) => ({ ...testCase, position: index + 1 })),
      });
      navigate(`/admin/assessments/${assessmentId}/edit`);
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'No fue posible guardar los cambios.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !question) {
    return <section className="admin-form-page"><Link className="back-link" to={`/admin/assessments/${assessmentId}/edit`}>← Volver al reto</Link><div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h1>El ejercicio no está disponible</h1><p>{error}</p></div></div></section>;
  }

  if (!question) {
    return <section className="admin-form-page" aria-busy="true"><span className="skeleton skeleton-editor-title" /><span className="skeleton skeleton-results-body" /></section>;
  }

  return (
    <section className="admin-form-page" aria-labelledby="edit-question-title">
      <Link className="back-link" to={`/admin/assessments/${assessmentId}/edit`}>← Volver al reto</Link>
      <header><h1 id="edit-question-title">{question.title}</h1><p>Actualiza la consigna y los casos de prueba antes de que existan resultados evaluados.</p></header>
      <form className="admin-form" aria-busy={submitting} onSubmit={submit}>
        <label>Título del ejercicio<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="full-width">Instrucciones para el candidato<textarea required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label>Puntaje del ejercicio<input required min={0} type="number" value={score} onChange={(event) => setScore(event.target.value)} /></label>
        <fieldset className="language-checkboxes"><legend>Lenguajes permitidos</legend>{programmingLanguages.map((language) => <label key={language.value}><input checked={allowedLanguages.includes(language.value)} onChange={() => toggleLanguage(language.value)} type="checkbox" />{language.label}</label>)}</fieldset>
        <section className="test-case-builder full-width" aria-labelledby="test-cases-title">
          <div><h2 id="test-cases-title">Casos de prueba</h2></div>
          {testCases.map((testCase, index) => (
            <div className="test-case-form" key={index}>
              <strong>Caso {index + 1}</strong>
              <label>Entrada<textarea required value={testCase.input} onChange={(event) => updateTestCase(index, { input: event.target.value })} /></label>
              <label>Salida esperada<textarea required value={testCase.expectedOutput} onChange={(event) => updateTestCase(index, { expectedOutput: event.target.value })} /></label>
              <label className="visibility-toggle"><input checked={testCase.isHidden} onChange={(event) => updateTestCase(index, { isHidden: event.target.checked })} type="checkbox" />Ocultar este caso al candidato</label>
              {testCases.length > 1 && <button className="remove-case" onClick={() => setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">Eliminar</button>}
            </div>
          ))}
          <button className="add-case" disabled={testCases.length >= 10} onClick={() => setTestCases((current) => [...current, { input: '', expectedOutput: '', isHidden: true }])} type="button">+ Agregar caso de prueba</button>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><Link className="open-link" to={`/admin/assessments/${assessmentId}/edit`}>Cancelar</Link><button className="admin-primary-action" disabled={submitting || allowedLanguages.length === 0} type="submit">{submitting ? <><span className="button-spinner" aria-hidden="true" />Guardando…</> : 'Guardar cambios'}</button></div>
      </form>
    </section>
  );
}
