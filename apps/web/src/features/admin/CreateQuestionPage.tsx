import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  createQuestion,
  getAssessment,
  listAssessmentQuestions,
  type AssessmentSummary,
} from '../../api/assessments';
import { ApiError } from '../../api/http';

type Language = 'JAVA' | 'JAVASCRIPT' | 'PYTHON';
type DraftTestCase = { input: string; expectedOutput: string; isHidden: boolean };

const languages: Array<{ value: Language; label: string }> = [
  { value: 'JAVA', label: 'Java' },
  { value: 'JAVASCRIPT', label: 'JavaScript' },
  { value: 'PYTHON', label: 'Python' },
];

function toSlug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function CreateQuestionPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentSummary | null>(null);
  const [nextPosition, setNextPosition] = useState(1);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [score, setScore] = useState('50');
  const [allowedLanguages, setAllowedLanguages] = useState<Language[]>(['JAVA', 'JAVASCRIPT', 'PYTHON']);
  const [testCases, setTestCases] = useState<DraftTestCase[]>([{ input: '', expectedOutput: '', isHidden: false }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!assessmentId) return;
    const controller = new AbortController();
    Promise.all([getAssessment(assessmentId, controller.signal), listAssessmentQuestions(assessmentId, controller.signal)])
      .then(([loadedAssessment, questions]) => {
        setAssessment(loadedAssessment);
        setNextPosition(questions.length + 1);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar el reto.');
      });
    return () => controller.abort();
  }, [assessmentId]);

  const toggleLanguage = (language: Language) => {
    setAllowedLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  };

  const updateTestCase = (index: number, patch: Partial<DraftTestCase>) => {
    setTestCases((current) => current.map((testCase, itemIndex) => itemIndex === index ? { ...testCase, ...patch } : testCase));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!assessmentId || allowedLanguages.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await createQuestion(assessmentId, {
        slug: slug || toSlug(title),
        title,
        description,
        position: nextPosition,
        score: Number(score),
        allowedLanguages,
        testCases: testCases.map((testCase, index) => ({ ...testCase, position: index + 1 })),
      });
      navigate('/admin');
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear el ejercicio.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-form-page" aria-labelledby="create-question-title">
      <Link className="back-link" to="/admin">← Volver a administración</Link>
      <header><p className="section-kicker">Paso 2 · Ejercicio {nextPosition}</p><h1 id="create-question-title">Agrega un ejercicio de programación</h1><p>{assessment ? `Para ${assessment.name}.` : 'Cargando información del reto…'}</p></header>
      <form className="admin-form" onSubmit={submit}>
        <label>Título del ejercicio<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej.: Paréntesis balanceados" /></label>
        <label>Slug<input required maxLength={100} value={slug} onChange={(event) => setSlug(toSlug(event.target.value))} placeholder="balanced-parentheses" /></label>
        <label className="full-width">Instrucciones para el candidato<textarea required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe la entrada, salida esperada y casos límite." /></label>
        <label>Puntaje del ejercicio<input required min={0} type="number" value={score} onChange={(event) => setScore(event.target.value)} /></label>
        <fieldset className="language-checkboxes"><legend>Lenguajes permitidos</legend>{languages.map((language) => <label key={language.value}><input checked={allowedLanguages.includes(language.value)} onChange={() => toggleLanguage(language.value)} type="checkbox" />{language.label}</label>)}</fieldset>
        <section className="test-case-builder full-width" aria-labelledby="test-cases-title">
          <div><p className="section-kicker">Evaluación automática</p><h2 id="test-cases-title">Casos de prueba</h2></div>
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
        <div className="form-actions"><Link className="open-link" to="/admin">Cancelar</Link><button className="admin-primary-action" disabled={submitting || allowedLanguages.length === 0} type="submit">{submitting ? 'Creando…' : 'Crear ejercicio'} <span aria-hidden="true">→</span></button></div>
      </form>
    </section>
  );
}
